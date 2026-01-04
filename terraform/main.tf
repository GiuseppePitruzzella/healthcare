terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ===== VARIABLES =====
variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "eu-north-1"
}

variable "environment" {
  description = "Environment name (demo, prod, test)"
  type        = string
  default     = "demo"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "hospital-monitoring"
}

variable "alert_email" {
  description = "Email address for SNS alert notifications"
  type        = string
  default     = "your.email@example.com"
}

# ===== LOCAL VARIABLES =====
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  
  common_tags = {
    Project     = "HospitalMonitoring"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Random suffix per nomi univoci
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# ===== COGNITO USER POOL =====
resource "aws_cognito_user_pool" "hospital_users" {
  name = "${local.name_prefix}-medical-staff"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  auto_verified_attributes = ["email"]

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = false
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  tags = local.common_tags
}

resource "aws_cognito_user_pool_client" "hospital_client" {
  name         = "${local.name_prefix}-web-client"
  user_pool_id = aws_cognito_user_pool.hospital_users.id

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  generate_secret = false

  callback_urls = [
    "http://localhost:3000",
    "http://${aws_s3_bucket.frontend.bucket}.s3-website.${var.aws_region}.amazonaws.com"
  ]

  logout_urls = [
    "http://localhost:3000",
    "http://${aws_s3_bucket.frontend.bucket}.s3-website.${var.aws_region}.amazonaws.com"
  ]

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = ["COGNITO"]

  read_attributes  = ["email", "name"]
  write_attributes = ["email", "name"]
}

resource "aws_cognito_user_pool_domain" "hospital_domain" {
  domain       = "${local.name_prefix}-${random_string.suffix.result}"
  user_pool_id = aws_cognito_user_pool.hospital_users.id
}

# ===== DYNAMODB TABLES =====
resource "aws_dynamodb_table" "patients" {
  name         = "Patients-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "patient_id"

  attribute {
    name = "patient_id"
    type = "S"
  }

  tags = local.common_tags
}

resource "aws_dynamodb_table" "vital_signs" {
  name         = "VitalSigns-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "patient_id"
  range_key    = "timestamp"

  attribute {
    name = "patient_id"
    type = "S"
  }
  attribute {
    name = "timestamp"
    type = "S"
  }

  stream_enabled   = true
  stream_view_type = "NEW_IMAGE"

  ttl {
    attribute_name = "expiration_time"
    enabled        = true
  }

  tags = local.common_tags
}

resource "aws_dynamodb_table" "alerts" {
  name         = "Alerts-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "alert_id"

  attribute {
    name = "alert_id"
    type = "S"
  }

  tags = local.common_tags
}

resource "aws_dynamodb_table" "websocket_connections" {
  name         = "WebSocketConnections-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connectionId"

  attribute {
    name = "connectionId"
    type = "S"
  }

  tags = local.common_tags
}

# ===== SNS TOPIC =====
# resource "aws_sns_topic" "alerts_topic" {
#   name = "${local.name_prefix}-emergency-alerts"
#   tags = local.common_tags
# }

# resource "aws_sns_topic_subscription" "email_subscription" {
#   topic_arn = aws_sns_topic.alerts_topic.arn
#   protocol  = "email"
#   endpoint  = var.alert_email
# }

# ===== IAM ROLE FOR LAMBDA =====
resource "aws_iam_role" "lambda_role" {
  name = "${local.name_prefix}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${local.name_prefix}-lambda-dynamodb-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Scan",
        "dynamodb:Query",
        "dynamodb:DeleteItem",
        "dynamodb:DescribeStream",
        "dynamodb:GetRecords",
        "dynamodb:GetShardIterator",
        "dynamodb:ListStreams"
      ]
      Resource = [
        aws_dynamodb_table.patients.arn,
        aws_dynamodb_table.vital_signs.arn,
        aws_dynamodb_table.alerts.arn,
        aws_dynamodb_table.websocket_connections.arn,
        "${aws_dynamodb_table.vital_signs.arn}/stream/*"
      ]
    }]
  })
}

resource "aws_iam_role_policy" "lambda_apigateway" {
  name = "${local.name_prefix}-lambda-apigateway-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "execute-api:ManageConnections",
        "execute-api:Invoke"
      ]
      Resource = "arn:aws:execute-api:*:*:*"
    }]
  })
}

# resource "aws_iam_role_policy" "lambda_sns" {
#   name = "${local.name_prefix}-lambda-sns-policy"
#   role = aws_iam_role.lambda_role.id

#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [{
#       Effect   = "Allow"
#       Action   = ["sns:Publish"]
#       Resource = aws_sns_topic.alerts_topic.arn
#     }]
#   })
# }

# ===== LAMBDA FUNCTIONS =====
data "archive_file" "vitals_simulator" {
  type        = "zip"
  source_file = "../lambda/vitals-simulator/app.py"
  output_path = "${path.module}/builds/vitals_simulator.zip"
}

resource "aws_lambda_function" "vitals_simulator" {
  filename         = data.archive_file.vitals_simulator.output_path
  function_name    = "${local.name_prefix}-vitals-simulator"
  role            = aws_iam_role.lambda_role.arn
  handler         = "app.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  source_code_hash = data.archive_file.vitals_simulator.output_base64sha256

  environment {
    variables = {
      PATIENTS_TABLE    = aws_dynamodb_table.patients.name
      VITAL_SIGNS_TABLE = aws_dynamodb_table.vital_signs.name
      ENVIRONMENT       = var.environment
    }
  }

  tags = local.common_tags
}

data "archive_file" "alert_detector" {
  type        = "zip"
  source_file = "../lambda/alert-detector/app.py"
  output_path = "${path.module}/builds/alert_detector.zip"
}

resource "aws_lambda_function" "alert_detector" {
  filename         = data.archive_file.alert_detector.output_path
  function_name    = "${local.name_prefix}-alert-detector"
  role            = aws_iam_role.lambda_role.arn
  handler         = "app.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  source_code_hash = data.archive_file.alert_detector.output_base64sha256

  environment {
    variables = {
      ALERTS_TABLE       = aws_dynamodb_table.alerts.name
      CONNECTIONS_TABLE  = aws_dynamodb_table.websocket_connections.name
      WEBSOCKET_ENDPOINT = replace(aws_apigatewayv2_stage.websocket_production.invoke_url, "wss://", "")
      # SNS_TOPIC_ARN      = aws_sns_topic.alerts_topic.arn
      ENABLE_EMAIL       = "false"  # Cambia in "true" per attivare email
      ENVIRONMENT        = var.environment
    }
  }

  tags = local.common_tags
}

resource "aws_lambda_event_source_mapping" "vitals_stream" {
  event_source_arn  = aws_dynamodb_table.vital_signs.stream_arn
  function_name     = aws_lambda_function.alert_detector.arn
  starting_position = "LATEST"
  batch_size        = 10
}

data "archive_file" "connection_manager" {
  type        = "zip"
  source_file = "../lambda/connection-manager/app.py"
  output_path = "${path.module}/builds/connection_manager.zip"
}

resource "aws_lambda_function" "connection_manager" {
  filename         = data.archive_file.connection_manager.output_path
  function_name    = "${local.name_prefix}-connection-manager"
  role            = aws_iam_role.lambda_role.arn
  handler         = "app.lambda_handler"
  runtime         = "python3.11"
  timeout         = 10
  source_code_hash = data.archive_file.connection_manager.output_base64sha256

  environment {
    variables = {
      CONNECTIONS_TABLE = aws_dynamodb_table.websocket_connections.name
      ENVIRONMENT       = var.environment
    }
  }

  tags = local.common_tags
}

data "archive_file" "api_handler" {
  type        = "zip"
  source_file = "../lambda/api-handler/app.py"
  output_path = "${path.module}/builds/api_handler.zip"
}

resource "aws_lambda_function" "api_handler" {
  filename         = data.archive_file.api_handler.output_path
  function_name    = "${local.name_prefix}-api-handler"
  role            = aws_iam_role.lambda_role.arn
  handler         = "app.lambda_handler"
  runtime         = "python3.11"
  timeout         = 10
  source_code_hash = data.archive_file.api_handler.output_base64sha256

  environment {
    variables = {
      PATIENTS_TABLE    = aws_dynamodb_table.patients.name
      VITAL_SIGNS_TABLE = aws_dynamodb_table.vital_signs.name
      ALERTS_TABLE      = aws_dynamodb_table.alerts.name
      ENVIRONMENT       = var.environment
    }
  }

  tags = local.common_tags
}

# ===== API GATEWAY REST =====
resource "aws_api_gateway_rest_api" "hospital_api" {
  name        = "${local.name_prefix}-rest-api"
  description = "REST API for Hospital Monitoring System (${var.environment})"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = local.common_tags
}

resource "aws_api_gateway_authorizer" "cognito" {
  name          = "${local.name_prefix}-cognito-authorizer"
  type          = "COGNITO_USER_POOLS"
  rest_api_id   = aws_api_gateway_rest_api.hospital_api.id
  provider_arns = [aws_cognito_user_pool.hospital_users.arn]
}

resource "aws_api_gateway_resource" "patients" {
  rest_api_id = aws_api_gateway_rest_api.hospital_api.id
  parent_id   = aws_api_gateway_rest_api.hospital_api.root_resource_id
  path_part   = "patients"
}

resource "aws_api_gateway_method" "get_patients" {
  rest_api_id   = aws_api_gateway_rest_api.hospital_api.id
  resource_id   = aws_api_gateway_resource.patients.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.hospital_api.id
  resource_id = aws_api_gateway_resource.patients.id
  http_method = aws_api_gateway_method.get_patients.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api_handler.invoke_arn
}

# ===== CORS CONFIGURATION =====
resource "aws_api_gateway_method" "options_patients" {
  rest_api_id   = aws_api_gateway_rest_api.hospital_api.id
  resource_id   = aws_api_gateway_resource.patients.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_integration" {
  rest_api_id = aws_api_gateway_rest_api.hospital_api.id
  resource_id = aws_api_gateway_resource.patients.id
  http_method = aws_api_gateway_method.options_patients.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_200" {
  rest_api_id = aws_api_gateway_rest_api.hospital_api.id
  resource_id = aws_api_gateway_resource.patients.id
  http_method = aws_api_gateway_method.options_patients.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.hospital_api.id
  resource_id = aws_api_gateway_resource.patients.id
  http_method = aws_api_gateway_method.options_patients.http_method
  status_code = aws_api_gateway_method_response.options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.options_integration]
}

resource "aws_api_gateway_gateway_response" "response_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.hospital_api.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'*'"
  }
}

resource "aws_api_gateway_gateway_response" "response_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.hospital_api.id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'*'"
  }
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.hospital_api.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "api_deployment" {
  depends_on = [
    aws_api_gateway_integration.lambda_integration,
    aws_api_gateway_integration.options_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.hospital_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.patients.id,
      aws_api_gateway_method.get_patients.id,
      aws_api_gateway_integration.lambda_integration.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "production" {
  deployment_id = aws_api_gateway_deployment.api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.hospital_api.id
  stage_name    = "production"

  tags = local.common_tags
}

# ===== API GATEWAY WEBSOCKET =====
resource "aws_apigatewayv2_api" "websocket" {
  name                       = "${local.name_prefix}-websocket"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"

  tags = local.common_tags
}

resource "aws_apigatewayv2_integration" "connect" {
  api_id           = aws_apigatewayv2_api.websocket.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.connection_manager.invoke_arn
}

resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.connect.id}"
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.connect.id}"
}

resource "aws_apigatewayv2_stage" "websocket_production" {
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = "production"
  auto_deploy = true

  tags = local.common_tags
}

resource "aws_lambda_permission" "websocket" {
  statement_id  = "AllowWebSocketInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.connection_manager.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

# ===== EVENTBRIDGE SCHEDULER =====
resource "aws_cloudwatch_event_rule" "vitals_scheduler" {
  name                = "${local.name_prefix}-vitals-simulator-schedule"
  description         = "Trigger vitals simulator every 5 minutes (${var.environment})"
  schedule_expression = "rate(5 minutes)"

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.vitals_scheduler.name
  target_id = "VitalsSimulator"
  arn       = aws_lambda_function.vitals_simulator.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.vitals_simulator.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.vitals_scheduler.arn
}

# ===== S3 BUCKET FOR FRONTEND =====
resource "aws_s3_bucket" "frontend" {
  bucket = "${local.name_prefix}-frontend-${random_string.suffix.result}"

  tags = local.common_tags
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

# ===== OUTPUTS =====
output "environment" {
  value       = var.environment
  description = "Deployed environment name"
}

output "cognito_user_pool_id" {
  value       = aws_cognito_user_pool.hospital_users.id
  description = "Cognito User Pool ID"
}

output "cognito_client_id" {
  value       = aws_cognito_user_pool_client.hospital_client.id
  description = "Cognito App Client ID"
}

output "cognito_domain" {
  value       = "https://${aws_cognito_user_pool_domain.hospital_domain.domain}.auth.${var.aws_region}.amazoncognito.com"
  description = "Cognito Hosted UI Domain"
}

output "rest_api_url" {
  value       = "${aws_api_gateway_stage.production.invoke_url}/patients"
  description = "REST API Endpoint"
}

output "websocket_url" {
  value       = aws_apigatewayv2_stage.websocket_production.invoke_url
  description = "WebSocket API Endpoint"
}

output "s3_website_url" {
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
  description = "Frontend S3 Website URL"
}

# output "sns_topic_arn" {
#   value       = aws_sns_topic.alerts_topic.arn
#   description = "SNS Topic ARN for Alerts"
# }

output "dynamodb_tables" {
  value = {
    patients    = aws_dynamodb_table.patients.name
    vital_signs = aws_dynamodb_table.vital_signs.name
    alerts      = aws_dynamodb_table.alerts.name
    connections = aws_dynamodb_table.websocket_connections.name
  }
  description = "DynamoDB Table Names"
}

output "lambda_functions" {
  value = {
    simulator          = aws_lambda_function.vitals_simulator.function_name
    alert_detector     = aws_lambda_function.alert_detector.function_name
    connection_manager = aws_lambda_function.connection_manager.function_name
    api_handler        = aws_lambda_function.api_handler.function_name
  }
  description = "Lambda Function Names"
}
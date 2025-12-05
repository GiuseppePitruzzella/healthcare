# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "eu-north-1"
}

resource "aws_dynamodb_table" "patients_table" {
  name           = "Patients_Terraform" # Equivalente a Patients
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "patient_id"

  attribute {
    name = "patient_id"
    type = "S" # S = Stringa
  }

  tags = {
    Project = "Healthcare"
    ManagedBy = "Terraform"
  }
}

# Setup Ruolo su IAM
resource "aws_iam_role" "lambda_tf_role" {
  name = "lambda_admin_terraform_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Accesso ai log
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_tf_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Accesso a DynamoDB
resource "aws_iam_role_policy_attachment" "lambda_dynamodb" {
  role       = aws_iam_role.lambda_tf_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

# Accesso a SNS (email)
resource "aws_iam_role_policy_attachment" "lambda_sns" {
  role       = aws_iam_role.lambda_tf_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSNSFullAccess"
}

# Accesso a API Gateway (WebSocket)
resource "aws_iam_role_policy_attachment" "lambda_apigateway" {
  role       = aws_iam_role.lambda_tf_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonAPIGatewayInvokeFullAccess"
}

# Codice python
data "archive_file" "simulator_zip" {
  type        = "zip"
  source_file = "../lambda/vitals-simulator/app.py" # Percorso del tuo file Python
  output_path = "vitals_simulator.zip"
}

resource "aws_lambda_function" "simulator_tf" {
  filename      = "vitals_simulator.zip"
  function_name = "vitals-simulator-terraform"
  role          = aws_iam_role.lambda_tf_role.arn
  handler       = "app.lambda_handler"
  runtime       = "python3.11"
  
  # Se lo zip cambia, terraform aggiorna la Lambda
  source_code_hash = data.archive_file.simulator_zip.output_base64sha256
  
  timeout = 10
}
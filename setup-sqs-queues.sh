#!/bin/bash

# SQS Queue Setup Script
# This script creates the necessary SQS queues for the B-Way application

set -e

# Configuration
AWS_REGION=${AWS_REGION:-"ap-south-1"}
QUEUE_PREFIX="bway"
ENVIRONMENT=${ENVIRONMENT:-"dev"}

# Queue names
ROUTE_ASSIGNMENT_QUEUE="${QUEUE_PREFIX}-route-assignment-${ENVIRONMENT}"
INVOICE_GENERATION_QUEUE="${QUEUE_PREFIX}-invoice-generation-${ENVIRONMENT}"

# Dead Letter Queue names
ROUTE_ASSIGNMENT_DLQ="${ROUTE_ASSIGNMENT_QUEUE}-dlq"
INVOICE_GENERATION_DLQ="${INVOICE_GENERATION_QUEUE}-dlq"

echo "🚀 Setting up SQS queues for B-Way application..."
echo "📍 Region: ${AWS_REGION}"
echo "🏷️  Environment: ${ENVIRONMENT}"

# Function to create queue with dead letter queue
create_queue_with_dlq() {
    local queue_name=$1
    local dlq_name=$2
    
    echo "📦 Creating Dead Letter Queue: ${dlq_name}"
    aws sqs create-queue \
        --queue-name "${dlq_name}" \
        --region "${AWS_REGION}" \
        --attributes '{
            "MessageRetentionPeriod": "1209600",
            "VisibilityTimeout": "60"
        }' > /dev/null

    # Get DLQ ARN
    DLQ_URL=$(aws sqs get-queue-url --queue-name "${dlq_name}" --region "${AWS_REGION}" --query 'QueueUrl' --output text)
    DLQ_ARN=$(aws sqs get-queue-attributes --queue-url "${DLQ_URL}" --attribute-names QueueArn --region "${AWS_REGION}" --query 'Attributes.QueueArn' --output text)
    
    echo "📦 Creating Main Queue: ${queue_name}"
    aws sqs create-queue \
        --queue-name "${queue_name}" \
        --region "${AWS_REGION}" \
        --attributes "{
            \"MessageRetentionPeriod\": \"1209600\",
            \"VisibilityTimeout\": \"300\",
            \"ReceiveMessageWaitTimeSeconds\": \"20\",
            \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"${DLQ_ARN}\\\",\\\"maxReceiveCount\\\":3}\"
        }" > /dev/null

    # Get main queue URL
    QUEUE_URL=$(aws sqs get-queue-url --queue-name "${queue_name}" --region "${AWS_REGION}" --query 'QueueUrl' --output text)
    
    echo "✅ Queue created: ${queue_name}"
    echo "🔗 Queue URL: ${QUEUE_URL}"
    echo "💀 DLQ URL: ${DLQ_URL}"
    echo ""
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials are not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI is configured"
echo ""

# Create Route Assignment Queue
create_queue_with_dlq "${ROUTE_ASSIGNMENT_QUEUE}" "${ROUTE_ASSIGNMENT_DLQ}"

# Create Invoice Generation Queue
create_queue_with_dlq "${INVOICE_GENERATION_QUEUE}" "${INVOICE_GENERATION_DLQ}"

echo "🎉 All SQS queues created successfully!"
echo ""
echo "📝 Add these URLs to your .env file:"
echo "SQS_ROUTE_ASSIGNMENT_QUEUE_URL=$(aws sqs get-queue-url --queue-name "${ROUTE_ASSIGNMENT_QUEUE}" --region "${AWS_REGION}" --query 'QueueUrl' --output text)"
echo "SQS_INVOICE_GENERATION_QUEUE_URL=$(aws sqs get-queue-url --queue-name "${INVOICE_GENERATION_QUEUE}" --region "${AWS_REGION}" --query 'QueueUrl' --output text)"
echo ""
echo "🔧 Optional: Dead Letter Queue URLs (for monitoring failed messages):"
echo "SQS_ROUTE_ASSIGNMENT_DLQ_URL=$(aws sqs get-queue-url --queue-name "${ROUTE_ASSIGNMENT_DLQ}" --region "${AWS_REGION}" --query 'QueueUrl' --output text)"
echo "SQS_INVOICE_GENERATION_DLQ_URL=$(aws sqs get-queue-url --queue-name "${INVOICE_GENERATION_DLQ}" --region "${AWS_REGION}" --query 'QueueUrl' --output text)"

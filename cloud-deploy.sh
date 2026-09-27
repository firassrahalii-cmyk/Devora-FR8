#!/bin/bash
# Devora VIP - Cloud Deploy Script
# One-click deployment for AWS, Azure, and Google Cloud

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "==========================================="
echo "  Cloud Deploy Script - Devora VIP"
echo "==========================================="
echo -e "${NC}"

# Check required tools
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        exit 1
    fi
}

# Detect cloud provider
detect_cloud() {
    if command -v aws &> /dev/null && aws sts get-caller-identity &> /dev/null 2>&1; then
        echo "aws"
    elif command -v az &> /dev/null && az account show &> /dev/null 2>&1; then
        echo "azure"
    elif command -v gcloud &> /dev/null && gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
        echo "gcloud"
    else
        echo "none"
    fi
}

# Deploy to AWS
deploy_aws() {
    local project=$1
    local region=${2:-us-east-1}
    echo -e "${YELLOW}Deploying to AWS (region: $region)...${NC}"

    if [ -f "Dockerfile" ]; then
        echo "Building Docker image..."
        aws ecr get-login-password --region $region | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$region.amazonaws.com
        docker build -t $project .
        docker tag $project:latest $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$region.amazonaws.com/$project:latest
        docker push $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$region.amazonaws.com/$project:latest
    elif [ -f "package.json" ]; then
        echo "Detected Node.js project - deploying to Elastic Beanstalk..."
        zip -r deploy.zip . -x "*.git*" "node_modules/*"
        aws elasticbeanstalk create-application-version --application-name $project --version-label v$(date +%s) --source-bundle S3Bucket="elasticbeanstalk-$region",S3Key="$project/deploy.zip"
        aws elasticbeanstalk update-environment --application-name $project --environment-name $project-env --version-label v$(date +%s)
    fi

    echo -e "${GREEN}AWS deployment complete!${NC}"
}

# Deploy to Azure
deploy_azure() {
    local project=$1
    local resource_group=${2:-devora-rg}
    echo -e "${YELLOW}Deploying to Azure...${NC}"

    if [ -f "Dockerfile" ]; then
        az acr build --registry devoraacr --image $project:latest .
    elif [ -f "package.json" ]; then
        az webapp deployment source config-local-git -g $resource_group -n $project
        git azure push
    fi

    echo -e "${GREEN}Azure deployment complete!${NC}"
}

# Deploy to Google Cloud
deploy_gcloud() {
    local project=$1
    local region=${2:-us-central1}
    echo -e "${YELLOW}Deploying to Google Cloud...${NC}"

    if [ -f "Dockerfile" ]; then
        gcloud builds submit --tag gcr.io/$project/$project .
        gcloud run deploy $project --image gcr.io/$project/$project --platform managed --region $region --allow-unauthenticated
    elif [ -f "app.yaml" ]; then
        gcloud app deploy
    fi

    echo -e "${GREEN}Google Cloud deployment complete!${NC}"
}

# Main
if [ $# -eq 0 ]; then
    echo "Usage: $0 <project-name> [region/resource-group]"
    echo ""
    echo "Examples:"
    echo "  $0 my-app                    # Auto-detect cloud provider"
    echo "  $0 my-app us-west-2          # Deploy to AWS us-west-2"
    echo "  $0 my-app devora-rg          # Deploy to Azure resource group"
    exit 1
fi

PROJECT=$1
REGION=$2
CLOUD=$(detect_cloud)

echo -e "${CYAN}Detected cloud: ${CLOUD}${NC}"

case $CLOUD in
    aws)    deploy_aws $PROJECT $REGION ;;
    azure)  deploy_azure $PROJECT $REGION ;;
    gcloud) deploy_gcloud $PROJECT $REGION ;;
    *)
        echo -e "${RED}No cloud provider detected. Please install and configure:"
        echo "  AWS:    https://aws.amazon.com/cli/"
        echo "  Azure:  https://docs.microsoft.com/en-us/cli/azure/"
        echo "  GCloud: https://cloud.google.com/sdk/docs/install${NC}"
        exit 1
        ;;
esac

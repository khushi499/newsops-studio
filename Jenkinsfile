pipeline {
  agent any

  environment {
    BACKEND_IMAGE = "yourdockerhubusername/newsops-backend"
    FRONTEND_IMAGE = "yourdockerhubusername/newsops-frontend"
    DOCKER_CREDENTIALS_ID = "dockerhub-credentials"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git log --oneline -5 || true'
      }
    }

    stage('Install Dependencies') {
      parallel {
        stage('Backend Install') {
          steps {
            dir('backend') {
              sh 'npm install'
            }
          }
        }
        stage('Frontend Install') {
          steps {
            dir('frontend') {
              sh 'npm install'
            }
          }
        }
      }
    }

    stage('Security Audit') {
      parallel {
        stage('Backend Audit') {
          steps {
            dir('backend') {
              sh 'npm audit --audit-level=high || true'
            }
          }
        }
        stage('Frontend Audit') {
          steps {
            dir('frontend') {
              sh 'npm audit --audit-level=high || true'
            }
          }
        }
      }
    }

    stage('Build Docker Images') {
      steps {
        script {
          sh 'docker build -t $BACKEND_IMAGE:$BUILD_NUMBER -t $BACKEND_IMAGE:latest backend'
          sh 'docker build -t $FRONTEND_IMAGE:$BUILD_NUMBER -t $FRONTEND_IMAGE:latest frontend'
        }
      }
    }

    stage('Push to Docker Hub') {
      steps {
        withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIALS_ID, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
          sh 'docker push $BACKEND_IMAGE:$BUILD_NUMBER'
          sh 'docker push $BACKEND_IMAGE:latest'
          sh 'docker push $FRONTEND_IMAGE:$BUILD_NUMBER'
          sh 'docker push $FRONTEND_IMAGE:latest'
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        sh 'kubectl apply -f devops/kubernetes/k8s/'
      }
    }

    stage('Health Check') {
      steps {
        sh 'curl -f http://localhost:5001/health || exit 1'
      }
    }
  }

  post {
    success {
      echo 'Pipeline finished successfully.'
    }
    failure {
      echo 'Pipeline failed.'
    }
  }
}

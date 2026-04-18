Apply manifests in this order:

```bash
kubectl apply -f devops/kubernetes/k8s/namespace.yaml
kubectl apply -f devops/kubernetes/k8s/postgres.yaml
kubectl apply -f devops/kubernetes/k8s/backend-deployment.yaml
kubectl apply -f devops/kubernetes/k8s/frontend-deployment.yaml
kubectl apply -f devops/kubernetes/k8s/hpa.yaml
```

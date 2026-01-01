# E-Commerce Microservices Platform

A production-grade e-commerce microservices architecture built with Node.js, MongoDB, Redis, and Kubernetes.

## 🏗️ Architecture

### Services

- **API Gateway** (3000): Entry point for all client requests
- **Auth Service** (4001): User authentication & JWT management
- **Product Service** (4002): Product catalog management
- **Order Service** (4003): Order processing & management
- **Payment Service** (4004): Payment processing with retry logic
- **Event Bus** (4005): Event-driven communication between services

### Infrastructure

- **MongoDB**: Primary database for all services
- **Redis**: Caching layer and rate limiting
- **Kubernetes**: Container orchestration
- **Docker**: Containerization

## ✨ Features

### Security

- ✅ JWT authentication with refresh tokens
- ✅ Helmet security headers
- ✅ Rate limiting (Redis-backed)
- ✅ Payload encryption (AES-256-CBC)
- ✅ Role-based access control (RBAC)
- ✅ Input validation with Joi

### Performance

- ✅ Redis caching (5-30 minute TTL)
- ✅ Database indexing
- ✅ Connection pooling
- ✅ Gzip compression
- ✅ Horizontal scaling ready

### Reliability

- ✅ 10-second retry mechanism with exponential backoff
- ✅ Graceful error handling
- ✅ Structured logging (Winston)
- ✅ Health check endpoints
- ✅ Event-driven architecture

## 🚀 Quick Start

### Prerequisites

```bash
# Required
node >= 18.0.0
docker >= 20.10.0
docker-compose >= 2.0.0

# For Kubernetes deployment
kubectl >= 1.24.0
minikube >= 1.28.0 or kind
skaffold >= 2.0.0
```

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd ecommerce-microservices
```

2. **Create shared utilities**

```bash
cd shared
npm install
cd ..
```

3. **Option A: Docker Compose (Recommended for Development)**

```bash
# Start all services
docker-compose up --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes
docker-compose down -v
```

4. **Option B: Kubernetes with Skaffold**

```bash
# Start minikube
minikube start --memory=2048 --cpus=2

# Enable ingress
minikube addons enable ingress

#get minikube ip
minikube ip

# Add to /etc/hosts
echo "$(minikube ip) ecommerce.local" | sudo tee -a /etc/hosts

# Start with Skaffold
skaffold dev

# Or deploy manually
kubectl apply -f infra/k8s/
```

## 📡 API Endpoints

### Base URL

```
Docker Compose: http://localhost:3000
Kubernetes: http://ecommerce.local
```

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/verify
GET  /api/auth/profile
```

### Products

```http
GET    /api/products
GET    /api/products/:id
POST   /api/products (admin only)
PUT    /api/products/:id (admin only)
DELETE /api/products/:id (admin only)
POST   /api/products/bulk
```

### Orders

```http
GET    /api/orders
GET    /api/orders/:id
POST   /api/orders
PUT    /api/orders/:id/cancel
```

### Payments

```http
POST   /api/payments/process
GET    /api/payments/:orderId
POST   /api/payments/:id/refund
```

### Developer Tools

```http
POST   /api/dev/encrypt
POST   /api/dev/decrypt
```

## 🔐 Using Encrypted Payloads

### Encrypt Your Payload

```bash
curl -X POST http://localhost:3000/api/dev/encrypt \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "email": "user@example.com",
      "password": "securepass123"
    }
  }'
```

Response:

```json
{
  "success": true,
  "encrypted": "a1b2c3d4e5f6...encrypted_string",
  "usage": "Send this encrypted string as { \"encrypted\": \"...\" } in request body"
}
```

### Use Encrypted Payload

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "encrypted": "a1b2c3d4e5f6...encrypted_string"
  }'
```

## 🧪 Testing the System

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### 2. Create Products (Admin)

```bash
# First, register an admin user or modify role in MongoDB
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": 999.99,
    "stock": 50,
    "category": "Electronics",
    "sku": "LAP001"
  }'
```

### 3. Create an Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      {
        "productId": "PRODUCT_ID",
        "quantity": 1
      }
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "zipCode": "400001",
      "country": "India"
    }
  }'
```

## 🔄 Event Flow Example

1. **Order Created** → Order Service emits `OrderCreated`
2. **Event Bus** receives and distributes to all services
3. **Payment Service** receives event and processes payment (with 10s retry)
4. **Payment Success** → Payment Service emits `PaymentProcessed`
5. **Order Service** receives event and updates order status
6. **Order Confirmed** ✅

## 📊 Monitoring

### Health Checks

```bash
# All services
curl http://localhost:3000/health
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health
curl http://localhost:4004/health
curl http://localhost:4005/health
```

### View Events

```bash
curl http://localhost:4005/events
```

### Redis Cache Status

```bash
docker exec -it ecommerce_redis redis-cli
> KEYS *
> GET user:USER_ID
> TTL products:all
```

### MongoDB Data

```bash
docker exec -it ecommerce_mongodb mongosh -u admin -p password123
> show dbs
> use ecommerce_auth
> db.users.find()
```

## 📁 Project Structure

```
ecommerce-microservices/
├── shared/                 # Shared utilities & middleware
│   ├── middleware/
│   └── utils/
├── api-gateway/           # API Gateway
├── auth-service/          # Authentication Service
├── product-service/       # Product Management
├── order-service/         # Order Management
├── payment-service/       # Payment Processing
├── event-bus/            # Event Distribution
├── infra/k8s/            # Kubernetes configs
├── docker-compose.yml    # Docker Compose config
├── skaffold.yaml         # Skaffold config
└── README.md
```

## 🛡️ Security Best Practices

1. **Change default credentials** in production
2. **Use secrets management** (Kubernetes Secrets, Vault)
3. **Enable SSL/TLS** for all communications
4. **Rotate JWT secrets** regularly
5. **Monitor rate limits** and adjust as needed
6. **Regular security audits** with npm audit
7. **Use environment-specific configs**

## 🚀 Production Deployment

### Kubernetes Production Setup

```bash
# Update secrets
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret=YOUR_PRODUCTION_SECRET \
  --from-literal=encryption-key=YOUR_32_CHAR_KEY

# Apply configurations
kubectl apply -f infra/k8s/

# Set up horizontal pod autoscaling
kubectl autoscale deployment auth-depl --min=2 --max=10 --cpu-percent=70

# Configure ingress with SSL
# Add TLS certificate to ingress-srv.yaml
```

### Environment Variables

Create `.env` files for each service with production values.

## 📈 Performance Optimization

- **Database Indexes**: Already configured for common queries
- **Redis Caching**: 5-30 minute TTL based on data volatility
- **Connection Pooling**: MongoDB (10), Redis (5)
- **Horizontal Scaling**: Kubernetes HPA configured
- **Load Balancing**: Automatic with Kubernetes Services

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs SERVICE_NAME

# Or in Kubernetes
kubectl logs POD_NAME
```

### Database Connection Issues

```bash
# Test MongoDB connection
docker exec -it ecommerce_mongodb mongosh -u admin -p password123

# Test Redis connection
docker exec -it ecommerce_redis redis-cli PING
```

### Event Bus Not Working

```bash
# Check event bus logs
docker-compose logs event-bus

# Verify service endpoints are correct
curl http://event-bus:4005/health
```

## 📝 License

MIT

## 👥 Contributing

Pull requests are welcome!

---

**Built with ❤️ for production-grade microservices**

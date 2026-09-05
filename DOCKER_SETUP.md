# Docker Setup Guide for LedgerCraft

## Prerequisites

1. **Install Docker Desktop for Windows**
   - Download from: https://www.docker.com/products/docker-desktop/
   - Install and restart your computer
   - Open Docker Desktop and ensure it's running

2. **Verify Docker Installation**
   ```bash
   docker --version
   docker-compose --version
   ```

## Quick Start (Recommended)

### 1. Start PostgreSQL Database Container

```bash
# Start the database container in detached mode
docker-compose up -d postgres

# Check if container is running
docker ps

# You should see: ledgercraft_db container running on port 5432
```

### 2. Verify Database is Ready

```bash
# Check database logs
docker-compose logs postgres

# Wait for message: "database system is ready to accept connections"
```

### 3. Start Development Server

```bash
# Install dependencies (if not already done)
npm install

# Start Next.js dev server
npm run dev
```

### 4. Access Application

- **Frontend**: http://localhost:3000
- **Database**: localhost:5432
  - Username: `postgres`
  - Password: `postgres123`
  - Database: `ledgercraft`

### 5. Login Credentials

- **Admin**: `admin001` / `Admin@123456`
- **Accountant**: `acct001` / `Accountant@123456`
- **User**: `user001` / `User@123456`

## Database Management

### Connect to Database

```bash
# Using Docker exec
docker exec -it ledgercraft_db psql -U postgres -d ledgercraft

# Using psql client (if installed locally)
psql -h localhost -U postgres -d ledgercraft
```

### View Tables

```sql
-- List all tables
\dt

-- Describe a table
\d contacts

-- View data
SELECT * FROM users;
SELECT * FROM contacts;
SELECT * FROM products;
```

### Backup Database

```bash
# Create backup
docker exec -t ledgercraft_db pg_dump -U postgres ledgercraft > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker exec -i ledgercraft_db psql -U postgres ledgercraft < backup_20240101_120000.sql
```

### Reset Database

```bash
# Stop and remove container with volumes
docker-compose down -v

# Start fresh
docker-compose up -d postgres

# Database will be recreated with initial data
```

## Docker Commands Reference

### Start Services

```bash
# Start all services
docker-compose up -d

# Start only database
docker-compose up -d postgres

# Start with logs visible
docker-compose up postgres
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (deletes all data)
docker-compose down -v
```

### View Logs

```bash
# View all logs
docker-compose logs

# View postgres logs
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f postgres
```

### Restart Services

```bash
# Restart database
docker-compose restart postgres

# Rebuild and restart
docker-compose up -d --build postgres
```

## Troubleshooting

### Port 5432 Already in Use

If you have PostgreSQL installed locally:

**Option 1: Stop local PostgreSQL**
```bash
# Windows
net stop postgresql-x64-15

# Or use Services app to stop PostgreSQL service
```

**Option 2: Change Docker port**
Edit `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # Use port 5433 instead
```

Then update `.env`:
```
PGPORT=5433
```

### Container Won't Start

```bash
# Check logs for errors
docker-compose logs postgres

# Remove old containers and volumes
docker-compose down -v

# Rebuild
docker-compose up -d --build postgres
```

### Database Connection Errors

1. **Check container is running**:
   ```bash
   docker ps | grep ledgercraft_db
   ```

2. **Check database is ready**:
   ```bash
   docker-compose logs postgres | grep "ready to accept"
   ```

3. **Test connection**:
   ```bash
   docker exec ledgercraft_db pg_isready -U postgres
   ```

4. **Verify .env file**:
   ```bash
   cat .env
   # Ensure PGHOST=localhost and PGPORT=5432
   ```

### Permission Errors

```bash
# Fix volume permissions (if needed)
docker-compose down
docker volume rm odoo_hackathon_postgres_data
docker-compose up -d postgres
```

## Production Deployment

### Build Application Container

```bash
# Build Next.js app container
docker-compose build app

# Start all services
docker-compose up -d
```

### Environment Variables

For production, update `.env`:
```bash
NODE_ENV=production
JWT_SECRET=<generate-strong-secret-key>
DATABASE_URL=postgresql://postgres:<strong-password>@postgres:5432/ledgercraft
```

### Generate Strong JWT Secret

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Data Persistence

### Where is Data Stored?

All PostgreSQL data is stored in a Docker volume named `postgres_data`.

**Location on Windows**:
```
\\wsl$\docker-desktop-data\version-pack-data\community\docker\volumes\odoo_hackathon_postgres_data\_data
```

### Backup Volume

```bash
# Create volume backup
docker run --rm -v odoo_hackathon_postgres_data:/data -v ${PWD}:/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore volume backup
docker run --rm -v odoo_hackathon_postgres_data:/data -v ${PWD}:/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

## Database Schema Management

### Initial Setup (Automatic)

When you first start the container, these scripts run automatically:
1. `sql/init.sql` - Creates users table and test users
2. `sql/accounting_schema.sql` - Creates all accounting tables with sample data

### Manual Schema Update

If you need to update schema manually:

```bash
# Method 1: Using docker exec
docker exec -i ledgercraft_db psql -U postgres -d ledgercraft < sql/accounting_schema.sql

# Method 2: Using psql client
psql -h localhost -U postgres -d ledgercraft -f sql/accounting_schema.sql
```

### Add New Tables

1. Create SQL file in `sql/` directory
2. Run it manually:
   ```bash
   docker exec -i ledgercraft_db psql -U postgres -d ledgercraft < sql/your_new_file.sql
   ```

## Monitoring

### View Database Stats

```bash
# Connect to database
docker exec -it ledgercraft_db psql -U postgres -d ledgercraft

# Run queries
SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables;
SELECT datname, numbackends FROM pg_stat_database WHERE datname = 'ledgercraft';
```

### Container Resource Usage

```bash
# View resource usage
docker stats ledgercraft_db

# View container details
docker inspect ledgercraft_db
```

## Common Workflows

### Daily Development

```bash
# Morning: Start database
docker-compose up -d postgres

# Start dev server
npm run dev

# Evening: Stop database (optional, can leave running)
docker-compose stop postgres
```

### Testing with Fresh Data

```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres

# Wait for ready
docker-compose logs -f postgres
# (Wait for "database system is ready")

# Start app
npm run dev
```

### Deploy to Production

```bash
# Build production images
docker-compose build

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f
```

## Security Best Practices

1. **Change Default Passwords**
   - Update `POSTGRES_PASSWORD` in `docker-compose.yml`
   - Update passwords in `.env`
   - Generate new JWT secret

2. **Use Strong Passwords**
   - Database: At least 16 characters
   - JWT Secret: At least 32 characters

3. **Don't Commit .env**
   - `.env` is in `.gitignore`
   - Share `.env.example` instead

4. **Production Checklist**
   - [ ] Change all default passwords
   - [ ] Generate new JWT secret
   - [ ] Set `NODE_ENV=production`
   - [ ] Enable SSL for database
   - [ ] Use environment secrets management
   - [ ] Regular backups configured
   - [ ] Monitor container logs

## Next Steps

1. ✅ Start Docker container: `docker-compose up -d postgres`
2. ✅ Verify database: `docker-compose logs postgres`
3. ✅ Start dev server: `npm run dev`
4. ✅ Open app: http://localhost:3000
5. ✅ Login with admin001 / Admin@123456

---

## Support

If you encounter issues:

1. Check Docker Desktop is running
2. Check container logs: `docker-compose logs postgres`
3. Verify port 5432 is available
4. Try resetting: `docker-compose down -v && docker-compose up -d postgres`
5. Check `.env` file has correct values

**Container is working when you see:**
```
database system is ready to accept connections
```

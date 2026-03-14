import request from 'supertest';
import { app } from '../src/index';
import { execute, queryOne } from '../src/db/connection';

describe('CoreInventory API Integration Tests', () => {
  let token: string;
  let testUserEmail = `test_${Date.now()}@example.com`;
  let productId: string;
  let warehouseId: string;
  let locationId: string;
  let categoryId: string;

  beforeAll(async () => {
    // Basic setup if necessary
  });

  afterAll(async () => {
    // Cleanup - best effort
    try {
      if (productId) await execute('DELETE FROM products WHERE id = ?', [productId]);
      if (categoryId) await execute('DELETE FROM categories WHERE id = ?', [categoryId]);
      if (locationId) await execute('DELETE FROM locations WHERE id = ?', [locationId]);
      if (warehouseId) await execute('DELETE FROM warehouses WHERE id = ?', [warehouseId]);
      await execute('DELETE FROM users WHERE email = ?', [testUserEmail]);
    } catch(e) { /* ignore */ }
  });

  describe('Authentication', () => {
    it('should signup a new user', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: testUserEmail,
          password: 'password123',
          role: 'MANAGER'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should login an existing user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'password123'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      token = res.body.token; // Save token for future requests
    });

    it('should generate an OTP for password reset', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Depending on implementation, OTP might be in the response in dev mode
      expect(res.body.message).toContain('OTP generated');
    });
  });

  describe('Warehouses and Categories Setup', () => {
    it('should get warehouses and locations', async () => {
      const res = await request(app)
        .get('/api/warehouses')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        warehouseId = res.body.data[0].id;
        
        const locRes = await request(app)
          .get('/api/warehouses/locations/all')
          .set('Authorization', `Bearer ${token}`);
        if(locRes.body.data && locRes.body.data.length > 0) {
          locationId = locRes.body.data[0].id;
        }
      }
    });

    it('should create a category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Category', description: 'Testing' });
      
      expect(res.status).toBe(201);
      categoryId = res.body.data.id;
    });
  });

  describe('Products', () => {
    it('should create a new product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sku: `SKU-${Date.now()}`,
          name: 'Test Product',
          category_id: categoryId,
          uom: 'PCS',
          min_stock: 10,
          price: 100
        });
      
      expect(res.status).toBe(201);
      productId = res.body.data.id;
    });

    it('should list products', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
    
    it('should fetch stock levels for the product', async () => {
      const res = await request(app)
        .get(`/api/products/${productId}/stock`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Operations', () => {
    let receiptId: string;
    let deliveryId: string;

    it('should create a RECEIPT operation', async () => {
      if(!locationId) return; // Skip if no location

      const res = await request(app)
        .post('/api/operations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'RECEIPT',
          to_location_id: locationId,
          reference: `REC-${Date.now()}`,
          items: [{ product_id: productId, quantity: 50 }]
        });
      
      expect(res.status).toBe(201);
      receiptId = res.body.data.id;
    });

    it('should validate the RECEIPT operation', async () => {
      if(!receiptId) return;

      const res = await request(app)
        .post(`/api/operations/${receiptId}/validate`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DONE');
      
      // Verify stock increased
      const stockRow = await queryOne<any>(
        'SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?',
        [productId, locationId]
      );
      expect(stockRow).toBeDefined();
      expect(Number(stockRow.quantity)).toBe(50);
    });

    it('should verify ledger entries dynamically created', async () => {
      if(!receiptId) return;

      const res = await request(app)
        .get(`/api/ledger?product_id=${productId}`)
        .set('Authorization', `Bearer ${token}`);
        
      expect(res.status).toBe(200);
      expect(res.body.data.some((l: any) => l.operation_id === receiptId)).toBe(true);
    });

    it('should create a DELIVERY operation', async () => {
      if(!locationId) return;

      const res = await request(app)
        .post('/api/operations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'DELIVERY',
          from_location_id: locationId,
          reference: `DEL-${Date.now()}`,
          items: [{ product_id: productId, quantity: 10 }]
        });
      
      expect(res.status).toBe(201);
      deliveryId = res.body.data.id;
    });

    it('should validate the DELIVERY operation and check stock decreased', async () => {
      if(!deliveryId) return;

      const res = await request(app)
        .post(`/api/operations/${deliveryId}/validate`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      
      // Verify stock decreased
      const stockRow = await queryOne<any>(
        'SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?',
        [productId, locationId]
      );
      expect(Number(stockRow.quantity)).toBe(40); // 50 - 10
    });
  });
});

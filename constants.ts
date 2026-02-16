
import { Role, User, ProductCategory, Product } from './types';

export const USERS: User[] = [
  { id: 'u1', name: 'Administrador General', role: Role.ADMIN, pin: '120390' },
  { id: 'u2', name: 'Colaborador Mañana', role: Role.MORNING, pin: '1234' },
  { id: 'u3', name: 'Colaborador Tarde', role: Role.AFTERNOON, pin: '4567' },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', sku: 'PRO-001', name: 'Proteína Whey Gold', category: ProductCategory.SUPPLEMENTS, price: 180, stock: 15, minStock: 5 },
  { id: 'p2', sku: 'BEB-001', name: 'Agua Mineral 500ml', category: ProductCategory.DRINKS, price: 2.50, stock: 48, minStock: 12 },
  { id: 'p3', sku: 'BEB-002', name: 'Gatorade Azul', category: ProductCategory.DRINKS, price: 4.00, stock: 24, minStock: 10 },
  { id: 'p4', sku: 'ACC-001', name: 'Toalla Microfibra', category: ProductCategory.ACCESSORIES, price: 25.00, stock: 10, minStock: 3 },
  { id: 'p5', sku: 'SUP-002', name: 'Creatina Monohidratada', category: ProductCategory.SUPPLEMENTS, price: 90.00, stock: 8, minStock: 4 },
];

export const FREE_PASS_OPTIONS = [
  { label: 'Libre 7', value: 7 },
  { label: 'Libre 8', value: 8 },
  { label: 'Libre 9', value: 9 },
  { label: 'Libre 10', value: 10 },
];

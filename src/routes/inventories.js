import express from 'express';
import * as inventoryController from '../controllers/inventoryController.js';
import * as itemController from '../controllers/itemController.js';
import * as discussionController from '../controllers/discussionController.js';
import { ensureAuthenticated } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Inventories
router.get('/', inventoryController.listInventories);
router.post('/', ensureAuthenticated, inventoryController.createInventory);
router.get('/:id', inventoryController.getInventory);
router.put('/:id', ensureAuthenticated, inventoryController.updateInventory);
router.delete('/:id', ensureAuthenticated, requireAdmin, inventoryController.deleteInventory);

// Fields
router.get('/:id/fields', inventoryController.listFields);
router.put('/:id/fields', ensureAuthenticated, inventoryController.upsertField);
router.delete('/:id/fields', ensureAuthenticated, inventoryController.deleteField);

// Access
router.get('/:id/access', ensureAuthenticated, inventoryController.listAccess);
router.post('/:id/access', ensureAuthenticated, inventoryController.addAccess);
router.delete('/:id/access', ensureAuthenticated, inventoryController.removeAccess);

// Custom ID elements
router.get('/:id/custom-id-elements', inventoryController.getCustomIdElements);
router.put('/:id/custom-id-elements', ensureAuthenticated, inventoryController.upsertCustomIdElements);

// Items list/create
router.get('/:inventoryId/items', itemController.listItems);
router.post('/:inventoryId/items', ensureAuthenticated, itemController.createItem);

// Single item
router.get('/:inventoryId/items/:itemId', itemController.getItem);
router.put('/:inventoryId/items/:itemId', ensureAuthenticated, itemController.updateItem);
router.delete('/:inventoryId/items/:itemId', ensureAuthenticated, itemController.deleteItem);

// Discussion
router.get('/:id/posts', discussionController.listPosts);
router.post('/:id/posts', ensureAuthenticated, discussionController.createPost);

export default router;

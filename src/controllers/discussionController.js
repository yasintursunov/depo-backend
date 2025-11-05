import * as discussionService from '../services/discussionService.js';

export async function listPosts(req, res) {
  try {
    const posts = await discussionService.listPosts(req.params.id);
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'list_failed' });
  }
}

export async function createPost(req, res) {
  try {
    if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
    const inventoryId = req.params.id;
    const { body } = req.body;
    if (!body) return res.status(400).json({ error: 'empty_body' });
    const post = await discussionService.createPost(inventoryId, req.user.id, body);
   
    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'create_failed' });
  }
}
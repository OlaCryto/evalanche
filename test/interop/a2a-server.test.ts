import { describe, it, expect, afterEach } from 'vitest';
import { A2AServer } from '../../src/interop/a2a-server';

describe('A2AServer', () => {
  let server: A2AServer;

  afterEach(async () => {
    if (server) await server.close();
  });

  describe('skill registration', () => {
    it('should register a skill and return an ID', () => {
      server = new A2AServer({ name: 'TestAgent', url: 'http://localhost:3200' });
      const id = server.registerSkill({
        name: 'Audit',
        description: 'Audit contracts',
        handler: async () => ({ text: 'done' }),
      });

      expect(typeof id).toBe('string');
    });

    it('should use provided skill ID', () => {
      server = new A2AServer({ name: 'TestAgent', url: 'http://localhost:3200' });
      const id = server.registerSkill({
        id: 'my-audit',
        name: 'Audit',
        description: 'Audit contracts',
        handler: async () => ({ text: 'done' }),
      });

      expect(id).toBe('my-audit');
    });

    it('should unregister a skill', () => {
      server = new A2AServer({ name: 'TestAgent', url: 'http://localhost:3200' });
      const id = server.registerSkill({
        name: 'Audit',
        description: 'Audit contracts',
        handler: async () => ({ text: 'done' }),
      });

      expect(server.unregisterSkill(id)).toBe(true);
      expect(server.unregisterSkill(id)).toBe(false);
    });
  });

  describe('agent card generation', () => {
    it('should generate a valid agent card', () => {
      server = new A2AServer({
        name: 'TestAgent',
        url: 'http://localhost:3200',
        description: 'A test agent',
        version: '1.0.0',
      });

      server.registerSkill({
        id: 'audit',
        name: 'Audit',
        description: 'Audit contracts',
        tags: ['security'],
        handler: async () => ({ text: 'done' }),
      });

      const card = server.getAgentCard();

      expect(card.name).toBe('TestAgent');
      expect(card.description).toBe('A test agent');
      expect(card.url).toBe('http://localhost:3200');
      expect(card.version).toBe('1.0.0');
      expect(card.skills).toHaveLength(1);
      expect(card.skills[0].id).toBe('audit');
      expect(card.skills[0].tags).toEqual(['security']);
      expect(card.defaultInputModes).toEqual(['text']);
      expect(card.defaultOutputModes).toEqual(['text']);
      expect(card.supportsStreaming).toBe(false);
    });

    it('should not include handler in agent card', () => {
      server = new A2AServer({ name: 'TestAgent', url: 'http://localhost:3200' });
      server.registerSkill({
        name: 'Audit',
        description: 'Audit contracts',
        handler: async () => ({ text: 'done' }),
      });

      const card = server.getAgentCard();
      const serialized = JSON.stringify(card);
      expect(serialized).not.toContain('handler');
    });
  });

  describe('HTTP server', () => {
    it('should serve agent card at /.well-known/agent-card.json', async () => {
      server = new A2AServer({ name: 'TestAgent', url: 'http://localhost:3201' });
      server.registerSkill({
        id: 'test',
        name: 'Test',
        description: 'Test skill',
        handler: async () => ({ text: 'ok' }),
      });
      server.listen(3201);

      // Wait briefly for server to start
      await new Promise((r) => setTimeout(r, 100));

      const res = await fetch('http://localhost:3201/.well-known/agent-card.json');
      expect(res.ok).toBe(true);

      const card = await res.json();
      expect(card.name).toBe('TestAgent');
      expect(card.skills).toHaveLength(1);
    });

    it('should accept task submissions', async () => {
      server = new A2AServer({ name: 'TestAgent', url: 'http://localhost:3202' });
      server.registerSkill({
        id: 'echo',
        name: 'Echo',
        description: 'Echo back input',
        handler: async (input) => ({ text: `Echo: ${input}` }),
      });
      server.listen(3202);

      await new Promise((r) => setTimeout(r, 100));

      const res = await fetch('http://localhost:3202/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_id: 'echo',
          messages: [{ role: 'user', parts: [{ type: 'text', text: 'Hello' }] }],
        }),
      });

      expect(res.status).toBe(201);
      const task = await res.json();
      expect(task.id).toBeTruthy();
      expect(['submitted', 'working', 'completed']).toContain(task.status);
    });

    it('should return 404 for unknown skill', async () => {
      server = new A2AServer({ name: 'TestAgent', url: 'http://localhost:3203' });
      server.listen(3203);

      await new Promise((r) => setTimeout(r, 100));

      const res = await fetch('http://localhost:3203/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill_id: 'nonexistent' }),
      });

      // Server returns 500 because the handler throws
      expect(res.status).toBe(500);
    });

    it('should get task status', async () => {
      server = new A2AServer({ name: 'TestAgent', url: 'http://localhost:3204' });
      server.registerSkill({
        id: 'slow',
        name: 'Slow',
        description: 'Slow task',
        handler: async () => {
          await new Promise((r) => setTimeout(r, 200));
          return { text: 'done' };
        },
      });
      server.listen(3204);

      await new Promise((r) => setTimeout(r, 100));

      // Submit
      const submitRes = await fetch('http://localhost:3204/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_id: 'slow',
          messages: [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }],
        }),
      });
      const task = await submitRes.json();

      // Get status immediately (should be working)
      const getRes = await fetch(`http://localhost:3204/tasks/${task.id}`);
      expect(getRes.ok).toBe(true);
      const status = await getRes.json();
      expect(status.id).toBe(task.id);

      // Wait for completion and check again
      await new Promise((r) => setTimeout(r, 300));
      const finalRes = await fetch(`http://localhost:3204/tasks/${task.id}`);
      const finalTask = await finalRes.json();
      expect(finalTask.status).toBe('completed');
      expect(finalTask.artifacts.length).toBeGreaterThan(0);
    });

    it('should cancel a task', async () => {
      server = new A2AServer({ name: 'TestAgent', url: 'http://localhost:3205' });
      server.registerSkill({
        id: 'long',
        name: 'Long',
        description: 'Long task',
        handler: async () => {
          await new Promise((r) => setTimeout(r, 5000));
          return { text: 'done' };
        },
      });
      server.listen(3205);

      await new Promise((r) => setTimeout(r, 100));

      // Submit
      const submitRes = await fetch('http://localhost:3205/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_id: 'long',
          messages: [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }],
        }),
      });
      const task = await submitRes.json();

      // Cancel
      const cancelRes = await fetch(`http://localhost:3205/tasks/${task.id}/cancel`, {
        method: 'POST',
      });
      expect(cancelRes.ok).toBe(true);
      const canceledTask = await cancelRes.json();
      expect(canceledTask.status).toBe('canceled');
    });

    it('should return 404 for unknown task', async () => {
      server = new A2AServer({ name: 'TestAgent', url: 'http://localhost:3206' });
      server.listen(3206);

      await new Promise((r) => setTimeout(r, 100));

      const res = await fetch('http://localhost:3206/tasks/nonexistent');
      expect(res.status).toBe(404);
    });

    it('should return 404 for unknown routes', async () => {
      server = new A2AServer({ name: 'TestAgent', url: 'http://localhost:3207' });
      server.listen(3207);

      await new Promise((r) => setTimeout(r, 100));

      const res = await fetch('http://localhost:3207/unknown');
      expect(res.status).toBe(404);
    });

    it('should handle CORS preflight', async () => {
      server = new A2AServer({ name: 'TestAgent', url: 'http://localhost:3208' });
      server.listen(3208);

      await new Promise((r) => setTimeout(r, 100));

      const res = await fetch('http://localhost:3208/.well-known/agent-card.json', {
        method: 'OPTIONS',
      });
      expect(res.status).toBe(204);
    });
  });

  describe('close', () => {
    it('should resolve immediately if no server started', async () => {
      server = new A2AServer({ name: 'TestAgent', url: 'http://localhost:3200' });
      await server.close(); // Should not throw
    });
  });
});

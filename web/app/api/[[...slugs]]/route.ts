import { Elysia } from 'elysia'

const app = new Elysia({ prefix: '/api' })
    .get('/', () => 'hello Next')
export const GET = app.handle 
export const POST = app.handle 

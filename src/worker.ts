interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 首先尝试从静态资源中获取文件
    const response = await env.ASSETS.fetch(request)
    
    // 如果找到静态资源，直接返回
    if (response.status !== 404) {
      return response
    }
    
    // 如果是 SPA 路由请求（非API），返回 index.html
    const url = new URL(request.url)
    
    // 对于所有非静态资源的导航请求，返回 index.html 让 React Router 处理
    if (request.method === 'GET' && !url.pathname.includes('.')) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', url).toString()))
    }
    
    // 其他情况返回 404
    return new Response('Not Found', { status: 404 })
  }
}
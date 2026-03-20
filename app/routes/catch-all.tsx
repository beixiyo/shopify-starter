import type { Route } from './+types/catch-all'

export async function loader({ request }: Route.LoaderArgs) {
  throw new Response(`${new URL(request.url).pathname} not found`, {
    status: 404,
  })
}

export default function CatchAllPage() {
  return null
}

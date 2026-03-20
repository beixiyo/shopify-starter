import type { Route } from './+types/logout'
import { redirect } from 'react-router'

// if we don't implement this, /account/logout will get caught by account.$.tsx to do login
export async function loader() {
  return redirect('/')
}

export async function action({ context }: Route.ActionArgs) {
  return context.customerAccount.logout()
}

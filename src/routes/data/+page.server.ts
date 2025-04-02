import type { ServerLoad } from "@sveltejs/kit";

export const load: ServerLoad = ({params}) => {
  console.log(params)
}

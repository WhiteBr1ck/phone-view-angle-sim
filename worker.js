export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const prefix = "/viewingangle";

    if (url.pathname === prefix) {
      url.pathname = "/";
    } else if (url.pathname.startsWith(prefix + "/")) {
      url.pathname = url.pathname.slice(prefix.length) || "/";
    } else {
      return new Response("Not found", { status: 404 });
    }

    return env.ASSETS.fetch(new Request(url.toString(), request));
  },
};

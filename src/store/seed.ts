import { newAssertion, newExtraction, newHttpRequest, newKeyValue } from "@/core/factory";
import type { Collection, Environment } from "@/core/types";
import { t } from "@/i18n";
import { uid } from "@/lib/id";

/** Example content created on first launch so the app isn't empty. */
export function seedWorkspace(): { collection: Collection; environment: Environment } {
  const environment: Environment = {
    id: uid("env"),
    name: "JSONPlaceholder",
    variables: [newKeyValue("baseUrl", "https://jsonplaceholder.typicode.com")],
  };

  const listPosts = newHttpRequest({
    name: t("seed.listPosts"),
    url: "{{baseUrl}}/posts?_limit=5",
    params: [newKeyValue("_limit", "5")],
    assertions: [
      newAssertion({ source: "status", operator: "equals", expected: "200" }),
      newAssertion({ source: "jsonPath", property: "length", operator: "equals", expected: "5" }),
    ],
    extractions: [newExtraction({ variable: "postId", path: "[0].id" })],
  });

  const getPost = newHttpRequest({
    name: t("seed.getPost"),
    url: "{{baseUrl}}/posts/{{postId}}",
    testScript: [
      'aq.test("responds with the requested post", () => {',
      "  const post = aq.response.json();",
      '  aq.expect(post.id).to.equal(Number(aq.variables.get("postId")));',
      '  aq.expect(post).to.have.property("title");',
      "});",
    ].join("\n"),
  });

  const createPost = newHttpRequest({
    name: t("seed.createPost"),
    method: "POST",
    url: "{{baseUrl}}/posts",
    preScript: 'aq.variables.set("title", `Hello from ArioQuest ${Date.now()}`);',
    testScript: [
      'pm.test("created", () => pm.response.to.have.status(201));',
      'pm.test("echoes the title", () => {',
      '  pm.expect(pm.response.json().title).to.equal(pm.variables.get("title"));',
      "});",
    ].join("\n"),
  });
  createPost.body.mode = "json";
  createPost.body.raw = JSON.stringify(
    { title: "{{title}}", body: "Sent at {{$isoTimestamp}}", userId: 1 },
    null,
    2,
  );

  const collection: Collection = {
    id: uid("col"),
    name: t("seed.collection"),
    description: t("seed.description"),
    items: [
      { type: "request", id: uid("item"), request: listPosts },
      { type: "request", id: uid("item"), request: getPost },
      { type: "request", id: uid("item"), request: createPost },
    ],
  };

  return { collection, environment };
}

import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  BedrockResponse: a.customType({
    body: a.string(),
    // Tee tästä pakollinen ja palauta "" kun ei ole virhettä.
    error: a.string(),
  }),

  askBedrock: a
    .query()
    .arguments({ ingredients: a.string().array() })
    .returns(a.ref("BedrockResponse"))
    .authorization((allow) => [allow.authenticated()])
    .handler(
      a.handler.custom({
        entry: "./bedrock.js",   // polku: amplify/data/bedrock.js
        dataSource: "bedrockDS", // nimen pitää täsmätä backendiin
      })
    ),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    // Jos haluat API keyn:
    // defaultAuthorizationMode: "apiKey",
    // apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
});
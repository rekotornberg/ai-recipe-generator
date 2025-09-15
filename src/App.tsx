import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

import {
  Authenticator,
  Loader,
  Button,
  View,
} from "@aws-amplify/ui-react";
import ErrorBoundary from "./ErrorBoundary"; // Import ErrorBoundary
import "@aws-amplify/ui-react/styles.css";
import "./App.css";
Amplify.configure(outputs);

export default function App() {
  const amplifyClient = useMemo(
    () => generateClient<Schema>({ authMode: "userPool" }),
    []
  );

  const [result, setResult] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setResult("");

    try {
      const formData = new FormData(event.currentTarget);
      const ingredients = (formData.get("ingredients")?.toString() ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (!ingredients.length) {
        setErrorMsg("Add at least one ingredient (comma-separated).");
        return;
      }

      const resp = await amplifyClient.queries.askBedrock({ ingredients });

      // Täydet logit: näemme oikean rakenteen jos joku kohta yllättää
      // (Katso selaimen konsoli)
      console.log("askBedrock raw resp:", JSON.stringify(resp, null, 2));

      if (Array.isArray(resp?.errors) && resp.errors.length > 0) {
        setErrorMsg(resp.errors.map((e) => e?.message ?? String(e)).join("\n"));
        return;
      }

      // Amplify Data palauttaa yleensä data.<queryName>
      const payload = (resp?.data as { askBedrock?: { body?: string; error?: string } })?.askBedrock ?? null;

      if (!payload || typeof payload !== "object") {
        setErrorMsg("Unexpected response shape from askBedrock.");
        return;
      }

      const body = typeof (payload as any).body === "string" ? (payload as any).body : "";
      const err  = typeof (payload as any).error === "string" ? (payload as any).error : "";

      if (err) {
        setErrorMsg(err);
        return;
      }

      setResult(body || "No data returned.");
    } catch (e: any) {
      console.error("onSubmit error:", e);
      setErrorMsg(e?.message ? String(e.message) : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <Authenticator>
        {({ signOut, user }) => (
          <div className="app-container">
            <div className="header-container">
              <h1 className="main-header">
                Meet Your Personal
                <br />
                <span className="highlight">Recipe AI toimiiko</span>
              </h1>
              <p className="description">
                Type a few ingredients separated by commas (e.g.{" "}
                <em>egg, milk, tomato</em>) and Recipe AI will generate a brand
                new recipe on demand.
              </p>
              <View marginTop="0.5rem" fontSize="0.9rem" opacity={0.8}>
                Signed in as <strong>{user?.username}</strong>{" "}
                <Button size="small" onClick={signOut} variation="link">
                  Sign out
                </Button>
              </View>
            </div>

            <form onSubmit={onSubmit} className="form-container">
              <div className="search-container">
                <input
                  type="text"
                  className="wide-input"
                  id="ingredients"
                  name="ingredients"
                  placeholder="Ingredient1, Ingredient2, Ingredient3,..."
                  autoComplete="off"
                  disabled={loading}
                />
                <button type="submit" className="search-button" disabled={loading}>
                  {loading ? "Generating..." : "Generate"}
                </button>
              </div>
            </form>

            <div className="result-container">
              {loading ? (
                <div className="loader-container">
                  <p>Loading...</p>
                  <Loader size="large" />
                  {/* Poistettu <Placeholder /> komponentit, jos niissä olisi children[0]-logiikkaa */}
                </div>
              ) : (
                <>
                  {errorMsg && <p className="error">{errorMsg}</p>}
                  {result && (
                    <pre className="result" style={{ whiteSpace: "pre-wrap" }}>
                      {result}
                    </pre>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Authenticator>
    </ErrorBoundary>
  );
}

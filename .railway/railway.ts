import { defineRailway, github, postgres, preserve, project, ref, service } from "railway/iac";

export default defineRailway(() => {
  const db = postgres("postgres", { region: "ams" });

  const backend = service("backend", {
    source: github("idurotola/taela-ai", { branch: "main", rootDirectory: "Backend" }),
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    healthcheck: "/healthz",
    healthcheckTimeout: 100,
    env: {
      DATABASE_URL: ref(db, "DATABASE_URL"),
      JWT_SECRET: preserve(),
      ADMIN_TOKEN: preserve(),
      ALLOWED_ORIGINS: preserve(),
    },
  });

  const frontend = service("frontend", {
    source: github("idurotola/taela-ai", { branch: "main", rootDirectory: "Frontend" }),
    build: "npm run build",
    start: "npm start",
    env: {
      NEXT_PUBLIC_API_URL: preserve(),
    },
  });

  return project("taela-ai", {
    resources: [backend, frontend, db],
  });
});

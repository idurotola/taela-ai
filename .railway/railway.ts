import { defineRailway, github, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const postgresVolume = volume("postgres-volume", { region: "ams", sizeMB: 500, allowOnlineResize: true });

  const backend = service("backend", {
    source: github("idurotola/taela-ai", { branch: "main", rootDirectory: "Backend" }),
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    healthcheck: "/healthz",
    healthcheckTimeout: 100,
    volumeMounts: { "/var/lib/postgresql/data": postgresVolume },
    env: {
      POSTGRES_PASSWORD: preserve(),
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
    resources: [backend, frontend, postgresVolume],
  });
});

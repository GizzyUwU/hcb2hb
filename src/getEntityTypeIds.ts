(async () => {
  const res = await fetch(
    process.env["HOMEBOX_SERVER_URL"] + "/api/v1/entity-types",
    {
      headers: {
        Authorization: `Bearer ${process.env["HOMEBOX_API_KEY"]}`
      }
    }
  );

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  console.log(data);
})();
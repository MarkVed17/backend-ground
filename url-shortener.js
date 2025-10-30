import express from "express";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

const urlStore = new Map();

function generateRandomAlias(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Generate a short, unique alias for a given long URL.
// Optionally, a custom alias and a time-to-live (TTL) can be specified.
app.post("/shorten", express.json(), (req, res) => {
  const data = req.body;
  const longUrl = data.long_url;
  let customAlias = data.custom_alias;
  let ttl_seconds = data.ttl_seconds;

  let shortUrl;

  if (customAlias && customAlias.length > 0) {
    shortUrl = `http://localhost:${PORT}/${customAlias}`;
  } else {
    customAlias = generateRandomAlias(6);
    shortUrl = `http://localhost:${PORT}/${customAlias}`;
  }

  if (!ttl_seconds || ttl_seconds < 0) {
    ttl_seconds = 120;
  }

  const newShortUrl = {
    short_url: shortUrl,
  };

  const timerId = setTimeout(() => {
    urlStore.delete(customAlias);
  }, ttl_seconds * 1000);

  urlStore.set(customAlias, {
    alias: customAlias,
    long_url: longUrl,
    access_count: 0,
    access_times: [],
    timerId,
  });

  res.status(201).json(newShortUrl);
});

// Redirect to the original long URL associated with the given alias.
app.get("/:alias", (req, res) => {
  const alias = req.params.alias;

  const urlData = urlStore.get(alias);

  if (!urlData) {
    res.status(404).json({ error: "Alias does not exist or has expired." });
  } else {
    const longUrl = urlData.long_url;

    urlStore.set(alias, {
      ...urlStore.get(alias),
      access_count: urlData.access_count + 1,
      access_times: [...urlData.access_times, `${new Date()}`],
    });

    res.status(302).redirect(longUrl);
  }
});

//  Retrieve access statistics for a given shortened URL alias.
app.get("/analytics/:alias", (req, res) => {
  const alias = req.params.alias;

  const urlData = urlStore.get(alias);

  if (!urlData) {
    res.status(404).json({ error: "Alias does not exist or has expired." });
  } else {
    res.status(200).json({
      alias: urlData.alias,
      longUrl: urlData.longUrl,
      ttl_seconds: urlData.ttl_seconds,
      access_count: urlData.access_count,
      access_times: urlData.access_times,
    });
  }
});

// Update the custom alias and TTL for a given alias.
app.put("/update/:alias", express.json(), (req, res) => {
  const alias = req.params.alias;

  const data = req.body;

  const customAlias = data.custom_alias;
  const ttl_seconds = data.ttl_seconds;

  // if only custom alias then new entry
  // if only ttl then update existing obj
  // if custom alias and ttl then new entry

  const hasCustomAlias = customAlias && customAlias.length > 0;
  const hasTtlSeconds = ttl_seconds && ttl_seconds > 0;

  const urlData = urlStore.get(alias);

  if (!urlData) {
    res.status(404).json({ error: "Alias does not exist or has expired." });
  } else {
    if (hasCustomAlias && hasTtlSeconds) {
      clearTimeout(urlData.timerId);

      const newTimerId = setTimeout(() => {
        urlStore.delete(customAlias);
      }, ttl_seconds * 1000);

      urlStore.set(customAlias, {
        ...urlStore.get(alias),
        ttl_seconds,
        timerId: newTimerId,
      });

      urlStore.delete(alias);
    } else if (hasCustomAlias) {
      urlStore.set(customAlias, {
        ...urlStore.get(alias),
        alias: customAlias,
        ttl_seconds,
      });

      urlStore.delete(alias);
    } else if (hasTtlSeconds) {
      clearTimeout(urlData.timerId);

      const newTimerId = setTimeout(() => {
        urlStore.delete(alias);
      }, ttl_seconds * 1000);

      urlStore.set(alias, {
        ...urlStore.get(alias),
        ttl_seconds,
        timerId: newTimerId,
      });
    }
    res.status(200).json({ message: "Successfully Updated" });
  }
});

// Delete the shortened URL data for the given alias.
app.delete("/delete/:alias", (req, res) => {
  const alias = req.params.alias;

  if (!alias) {
    res.status(404).json({ error: "Alias does not exist or has expired." });
  } else {
    urlStore.delete(alias);
    res.status(200).json({ message: "Successfully Deleted" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

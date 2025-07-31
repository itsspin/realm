// Helper to fetch JSON files with extensive logging for debugging
export async function fetchWithDebug(url) {
  console.log(`Fetching ${url}`);
  try {
    const res = await fetch(url);
    console.log(`${url} status: ${res.status} ${res.ok ? 'OK' : res.statusText}`);
    if (!res.ok) {
      // if 404 or other error, inform and return null
      console.error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
      return null;
    }
    try {
      const data = await res.json();
      console.log(`${url} parsed data:`, data);
      return data;
    } catch (parseErr) {
      console.error(`Invalid JSON in ${url}:`, parseErr);
      return null;
    }
  } catch (err) {
    console.error(`Error fetching ${url}:`, err);
    return null;
  }
}

// Example usage for zones, mob, and map assets
export async function debugLoadAssets() {
  const files = ['zones.json', 'mobData.json', 'mapData.json'];
  const results = await Promise.all(files.map((f) => fetchWithDebug(f)));
  console.log('Debug load results', results);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { query } = req.body

  try {
    const igdbRes = await fetch("https://www.igdb.com/gql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "https://www.igdb.com",
        "Referer": "https://www.igdb.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        operationName: "GetAutocompleteSuggestions",
        variables: {
          limit: 20,
          search: query
        },
        query: `
          query GetAutocompleteSuggestions($search: String!, $limit: Int, $gamesOnly: Boolean) {
            autocomplete(search: $search, limit: $limit, gamesOnly: $gamesOnly) {
              options {
                id
                slug
                value
                modelType
                cloudinary
                url
                text
                categoryName
                year
                firstReleaseDate
                name
                isExact
                __typename
              }
              __typename
            }
          }
        `
      })
    })

    const data = await igdbRes.json()
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: "fail" })
  }
}

import { getAuthHeaders } from "./shopHelpers"

async function adminFetch(action, method = "GET", body = null) {
	const headers = await getAuthHeaders()
	if (!headers) throw new Error("Not authenticated")

	const opts = { method, headers }
	if (body) opts.body = JSON.stringify(body)

	const res = await fetch(`/api/shop/admin/${action}`, opts)
	const data = await res.json()

	if (!res.ok) throw new Error(data.error || "Request failed")
	return data
}

export const adminApi = {
	getCollections: () => adminFetch("collections"),
	createCollection: (body) => adminFetch("collections", "POST", body),
	updateCollection: (body) => adminFetch("collections", "PUT", body),
	deleteCollection: (id) => adminFetch("collections", "DELETE", { id }),

	getCategories: () => adminFetch("categories"),
	createCategory: (body) => adminFetch("categories", "POST", body),
	updateCategory: (body) => adminFetch("categories", "PUT", body),
	deleteCategory: (id) => adminFetch("categories", "DELETE", { id }),

	getItems: () => adminFetch("items"),
	createItem: (body) => adminFetch("items", "POST", body),
	updateItem: (body) => adminFetch("items", "PUT", body),
	deleteItem: (id) => adminFetch("items", "DELETE", { id }),

	addCollectionItem: (collection_id, item_id, sort_order = 0) =>
		adminFetch("collection-items", "POST", { collection_id, item_id, sort_order }),
	removeCollectionItem: (collection_id, item_id) =>
		adminFetch("collection-items", "DELETE", { collection_id, item_id }),
	updateCollectionItemOrder: (collection_id, item_id, sort_order) =>
		adminFetch("collection-items", "PUT", { collection_id, item_id, sort_order }),

	getArtists: () => adminFetch("artists"),
	createArtist: (body) => adminFetch("artists", "POST", body),
	updateArtist: (body) => adminFetch("artists", "PUT", body),
	deleteArtist: (id) => adminFetch("artists", "DELETE", { id }),
}
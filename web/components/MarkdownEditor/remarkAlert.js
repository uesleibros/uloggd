import { visit } from "unist-util-visit"

export function remarkAlert() {
	return (tree) => {
		visit(tree, (node) => {
			if (
				node.type === "containerDirective" ||
				node.type === "leafDirective"
			) {
				const type = node.name

				node.data = node.data || {}
				node.data.hName = "alert-box"
				node.data.hProperties = { type }
			}
		})
	}
}
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"

export default function AvatarDecorationPreview({ item, user }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <AvatarWithDecoration
        src={user?.avatar}
        alt={user?.username || "Preview"}
        decorationUrl={item.asset_url}
        size="profile"
        showStatus={false}
      />
      <span className="text-xs text-zinc-500 font-medium">Preview</span>
    </div>
  )
}
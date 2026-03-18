import { useParams, Link, Navigate } from "react-router-dom"
import { FileText, Shield, ArrowLeft } from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import Translatable from "@components/UI/Translatable"

const LEGAL_PAGES = {
  terms: {
    title: "Terms of Service",
    description: "Terms of service and conditions for uloggd",
    icon: FileText,
    updatedDate: "January 2025",
    content: `By accessing and using uloggd (the "Website"), you accept and agree to be bound by the following terms and conditions ("Terms"):

## Intended use

uloggd is a video game website and may not be used to host other forms of media, including but not limited to movies, television shows, and music.

## Conduct

You must not use the Website to promote, engage in or incite hate, violence or intolerance based on race, age, gender, gender identity, ethnicity, religion or sexual orientation.

## No spam or multiple accounts

You must not use the Website or encourage others to use the Website to create multiple accounts, deceive or mislead other users, disrupt discussions, game the Website's mechanics, alter consensus or post spam.

## No malicious use

You agree to access the Website through the interface we provide. You must not use the Website for any malicious means, or abuse, harass, threaten, intimidate or impersonate any other user of the Website. You must not request or attempt to solicit personal or identifying information from another member of the Website.

## No illegal use

You must not use the Website for any unlawful purpose, or post any information that is in breach of any confidentiality obligation, copyright, trade mark or other intellectual property or proprietary rights of any person.

## Removal of content

We reserve the right to remove any content from the Website which we consider to be offensive, unlawful or otherwise in breach of these Terms.

## Termination of the Website

The Website, for any reason, may terminate or suspend any or all of its services without prior notice or liability.

## Termination of inactive accounts

If you have not confirmed your account with your email address and remain inactive for at least three months, we may terminate your account.

## Termination of accounts

If you do not abide by these Terms, we may terminate your account.

## Technical malfunctions and difficulties

We will try to address all technical issues that arise on the Website. However, we will not be liable for any loss suffered as a result of any partial or total breakdown of the Website or any technical malfunctions.

## Affiliate Links

Any outgoing link to partner stores may be sponsored and any purchase made through the link will help us with no extra cost to you.`,
  },
  privacy: {
    title: "Privacy Policy",
    description: "Privacy policy and data protection for uloggd",
    icon: Shield,
    updatedDate: "January 2025",
    content: `This Privacy Policy describes how uloggd ("we", "our" or "Website") collects, uses and protects your personal information.

## Information we collect

### Account information
When you create an account, we collect:
- Email address
- Username
- Password (encrypted)
- Profile picture (optional)

### Usage information
We automatically collect:
- IP address
- Browser type
- Pages visited
- Date and time of access

### User content
We store the content you create:
- Game reviews
- Lists and tierlists
- Comments
- Screenshots

## How we use your information

We use your information to:
- Provide and maintain our services
- Personalize your experience
- Send important notifications
- Improve our services
- Prevent fraud and abuse

## Information sharing

We do not sell your personal information. We may share information with:
- Service providers who help us operate the Website
- Legal authorities when required by law

## Cookies

We use cookies to:
- Keep you logged in
- Remember your preferences
- Analyze Website usage

## Security

We implement security measures to protect your information, including:
- Data encryption
- Restricted access to personal information
- Security monitoring

## Your rights

You have the right to:
- Access your personal data
- Correct incorrect information
- Delete your account and data
- Export your data

## Data retention

We keep your information as long as your account is active. After account deletion, your data will be removed within 30 days.

## Minors

The Website is not intended for children under 13. We do not knowingly collect information from children.

## Changes to this policy

We may update this policy periodically. We will notify you of significant changes.

## Contact

For privacy questions, contact us: contact@uloggd.com`,
  },
}

export default function LegalPage() {
  const { type } = useParams()

  if (!LEGAL_PAGES[type]) {
    return <Navigate to="/legal/terms" replace />
  }

  const page = LEGAL_PAGES[type]
  const Icon = page.icon

  usePageMeta({
    title: `${page.title} - uloggd`,
    description: page.description,
  })

  return (
    <div className="py-8 sm:py-12 max-w-3xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {page.title}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Last updated: {page.updatedDate}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-8">
        <Link
          to="/legal/terms"
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            type === "terms"
              ? "bg-indigo-500 text-white"
              : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
          }`}
        >
          Terms of Service
        </Link>
        <Link
          to="/legal/privacy"
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            type === "privacy"
              ? "bg-indigo-500 text-white"
              : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
          }`}
        >
          Privacy Policy
        </Link>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 sm:p-8">
        <Translatable className="prose prose-invert prose-zinc max-w-none prose-headings:text-white prose-headings:font-semibold prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2 prose-p:text-zinc-400 prose-p:leading-relaxed prose-li:text-zinc-400 prose-ul:mt-2 prose-ul:space-y-1 prose-strong:text-white">
          {page.content}
        </Translatable>
      </div>

      <div className="mt-8 p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
        <p className="text-sm text-zinc-500 text-center">
          Have any questions? Contact us:{" "}
          <a
            href="mailto:contact@uloggd.com"
            className="text-indigo-400 hover:underline"
          >
            contact@uloggd.com
          </a>
        </p>
      </div>
    </div>
  )
}

from __future__ import annotations

import argparse
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".", help="project root path")
    parser.add_argument("--router", choices=("app", "pages"), default="app")
    parser.add_argument(
        "--src",
        action="store_true",
        help="use src/ directory layout",
    )
    parser.add_argument(
        "--tailwind",
        action="store_true",
        help="write Tailwind config and global css",
    )
    parser.add_argument(
        "--ts",
        action="store_true",
        help="write tsconfig.json template",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="overwrite existing files",
    )
    return parser.parse_args()


def write_file(path: Path, content: str, force: bool) -> bool:
    if path.exists() and not force:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return True


def layout_tsx_content(include_globals: bool) -> str:
    import_line = 'import "./globals.css";\n\n' if include_globals else ""
    return (
        f"{import_line}"
        'export const metadata = { title: "App" };\n\n'
        "export default function RootLayout({\n"
        "  children,\n"
        "}: {\n"
        "  children: React.ReactNode;\n"
        "}) {\n"
        "  return (\n"
        "    <html lang=\"zh\">\n"
        "      <body>{children}</body>\n"
        "    </html>\n"
        "  );\n"
        "}\n"
    )


def page_tsx_content() -> str:
    return (
        "export default function Page() {\n"
        "  return (\n"
        "    <main className=\"min-h-screen bg-slate-950 text-white\">\n"
        "      <h1 className=\"p-6 text-2xl font-semibold\">Hello</h1>\n"
        "    </main>\n"
        "  );\n"
        "}\n"
    )


def pages_index_content() -> str:
    return (
        "export default function Home() {\n"
        "  return (\n"
        "    <main className=\"min-h-screen bg-slate-950 text-white\">\n"
        "      <h1 className=\"p-6 text-2xl font-semibold\">Hello</h1>\n"
        "    </main>\n"
        "  );\n"
        "}\n"
    )


def pages_app_content() -> str:
    return (
        'import type { AppProps } from "next/app";\n'
        'import "../styles/globals.css";\n\n'
        "export default function App({ Component, pageProps }: AppProps) {\n"
        "  return <Component {...pageProps} />;\n"
        "}\n"
    )


def app_globals_css_content() -> str:
    return "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n"


def tailwind_config_content(use_src: bool) -> str:
    prefix = "./src" if use_src else "."
    pattern = "{ts,tsx,mdx}"
    return (
        'import type { Config } from "tailwindcss";\n\n'
        "const config: Config = {\n"
        "  content: [\n"
        f'    "{prefix}/app/**/*.{pattern}",\n'
        f'    "{prefix}/pages/**/*.{pattern}",\n'
        f'    "{prefix}/components/**/*.{pattern}",\n'
        "  ],\n"
        "  theme: {\n"
        "    extend: {},\n"
        "  },\n"
        "  plugins: [],\n"
        "};\n\n"
        "export default config;\n"
    )


def postcss_config_content() -> str:
    return (
        "module.exports = {\n"
        "  plugins: {\n"
        "    tailwindcss: {},\n"
        "    autoprefixer: {},\n"
        "  },\n"
        "};\n"
    )


def tsconfig_content(use_src: bool) -> str:
    path_prefix = "./src/*" if use_src else "./*"
    return (
        "{\n"
        "  \"compilerOptions\": {\n"
        "    \"target\": \"ES2017\",\n"
        "    \"lib\": [\"dom\", \"dom.iterable\", \"esnext\"],\n"
        "    \"allowJs\": true,\n"
        "    \"skipLibCheck\": true,\n"
        "    \"strict\": true,\n"
        "    \"noEmit\": true,\n"
        "    \"esModuleInterop\": true,\n"
        "    \"module\": \"esnext\",\n"
        "    \"moduleResolution\": \"bundler\",\n"
        "    \"resolveJsonModule\": true,\n"
        "    \"isolatedModules\": true,\n"
        "    \"jsx\": \"react-jsx\",\n"
        "    \"incremental\": true,\n"
        "    \"paths\": {\n"
        f"      \"@/*\": [\"{path_prefix}\"]\n"
        "    }\n"
        "  },\n"
        "  \"include\": [\"next-env.d.ts\", \"**/*.ts\", \"**/*.tsx\"],\n"
        "  \"exclude\": [\"node_modules\"]\n"
        "}\n"
    )


def main() -> int:
    args = parse_args()
    base = Path(args.root).resolve()
    use_src = args.src
    root = base / "src" if use_src else base

    files_written = 0
    files_skipped = 0
    total_files = 0

    if args.router == "app":
        total_files += 1
        files_written += int(
            write_file(
                root / "app" / "layout.tsx",
                layout_tsx_content(args.tailwind),
                args.force,
            )
        )
        total_files += 1
        files_written += int(
            write_file(
                root / "app" / "page.tsx",
                page_tsx_content(),
                args.force,
            )
        )
    else:
        total_files += 1
        files_written += int(
            write_file(
                root / "pages" / "index.tsx",
                pages_index_content(),
                args.force,
            )
        )
        if args.tailwind:
            total_files += 1
            files_written += int(
                write_file(
                    root / "pages" / "_app.tsx",
                    pages_app_content(),
                    args.force,
                )
            )

    if args.tailwind:
        total_files += 1
        files_written += int(
            write_file(
                base / "tailwind.config.ts",
                tailwind_config_content(use_src),
                args.force,
            )
        )
        total_files += 1
        files_written += int(
            write_file(
                base / "postcss.config.js",
                postcss_config_content(),
                args.force,
            )
        )
        globals_path = (
            root / "app" / "globals.css"
            if args.router == "app"
            else root / "styles" / "globals.css"
        )
        total_files += 1
        files_written += int(
            write_file(
                globals_path,
                app_globals_css_content(),
                args.force,
            )
        )

    if args.ts:
        total_files += 1
        files_written += int(
            write_file(base / "tsconfig.json", tsconfig_content(use_src), args.force)
        )

    files_skipped = total_files - files_written

    print("Generation complete.")
    print(f"Files written: {files_written}, skipped: {files_skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

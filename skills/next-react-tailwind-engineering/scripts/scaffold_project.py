from __future__ import annotations

import argparse
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".", help="project root path")
    parser.add_argument(
        "--router",
        choices=("app", "pages"),
        default="app",
        help="router mode",
    )
    parser.add_argument(
        "--no-src",
        action="store_true",
        help="do not create src/ prefix",
    )
    parser.add_argument(
        "--templates",
        action="store_true",
        help="write basic Tailwind and CSS templates",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="overwrite existing template files",
    )
    return parser.parse_args()


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write_file(path: Path, content: str, force: bool) -> bool:
    if path.exists() and not force:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return True


def build_paths(base: Path, use_src: bool) -> dict[str, Path]:
    root = base / "src" if use_src else base
    return {
        "router": root / "app",
        "pages": root / "pages",
        "components_ui": root / "components" / "ui",
        "components_feature": root / "components" / "feature",
        "components_layout": root / "components" / "layout",
        "hooks": root / "hooks",
        "lib": root / "lib",
        "services": root / "services",
        "store": root / "store",
        "styles": root / "styles",
        "types": root / "types",
        "utils": root / "utils",
    }


def tailwind_config_content() -> str:
    return (
        'import type { Config } from "tailwindcss";\n\n'
        "const config: Config = {\n"
        "  content: [\n"
        '    "./src/app/**/*.{ts,tsx,mdx}",\n'
        '    "./src/pages/**/*.{ts,tsx,mdx}",\n'
        '    "./src/components/**/*.{ts,tsx,mdx}",\n'
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


def globals_css_content() -> str:
    return "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n"


def main() -> int:
    args = parse_args()
    base = Path(args.root).resolve()
    use_src = not args.no_src
    paths = build_paths(base, use_src)

    if args.router == "pages":
        ensure_dir(paths["pages"])
    else:
        ensure_dir(paths["router"])

    for key, path in paths.items():
        if key in ("router", "pages"):
            continue
        ensure_dir(path)

    created_files = []
    if args.templates:
        created_files.append(
            write_file(
                base / "tailwind.config.ts",
                tailwind_config_content(),
                args.force,
            )
        )
        created_files.append(
            write_file(
                base / "postcss.config.js",
                postcss_config_content(),
                args.force,
            )
        )
        created_files.append(
            write_file(
                paths["styles"] / "globals.css",
                globals_css_content(),
                args.force,
            )
        )

    print("Scaffold complete.")
    if args.templates:
        written = sum(1 for item in created_files if item)
        skipped = len(created_files) - written
        print(f"Templates written: {written}, skipped: {skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

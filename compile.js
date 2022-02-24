#!/usr/bin/env node
"use strict";
import {
	writeFileSync,
	mkdirSync,
	readdirSync,
	rmSync,
	readFileSync,
} from "fs";
import { execSync } from "child_process";
import path from "path";

import args from "command-line-args";
import usage from "command-line-usage";
import Mustache from "mustache";
import { parseFile } from "@fast-csv/parse";

const safeFileName = (f) => f.toLowerCase().replaceAll(" ", "-");

async function compile(config) {
	const template = readFileSync(config.template, "utf-8");
	let count = 0;

	await new Promise((fulfill, reject) => {
		parseFile(config.source, { headers: true })
			.on("error", (e) => reject(e))
			.on("end", () => fulfill())
			.on("data", (row) => {
				const packageName =
					safeFileName(row[config["package-name-column"]]) ??
					`row-${++count}`;

				mkdirSync(path.join(config.output, packageName), {
					recursive: true,
				});

				writeFileSync(
					path.join(config.output, packageName, "cmi5.xml"),
					Mustache.render(template, row)
				);

				execSync(`zip -r ${packageName}.zip ${packageName}`, {
					cwd: config.output,
				});

				rmSync(path.join(config.output, packageName), {
					recursive: true,
				});

				console.log("Generated %s", packageName);
			});
	});
}

const options = [
	{
		name: "help",
		description: "Display this help page",
		alias: "h",
		type: Boolean,
	},
	{
		name: "template",
		description: "File containing a mustache template",
		alias: "t",
		type: String,
	},
	{
		name: "source",
		description: "CSV (with headers) to run each row through the template",
		alias: "s",
		type: String,
	},
	{
		name: "output",
		description: "Where to save compiled templates",
		alias: "o",
		type: String,
	},
	{
		name: "package-name-column",
		description: "Column to use as the name of the package",
		type: String,
	},
];

const configs = args(options);

if (configs.help) {
	console.log(
		usage([
			{
				header: "CMI5 Generator",
				content:
					"Compile CMI5 packages for each row in a CSV based on a template.",
			},
			{ header: "Options", optionList: options },
		])
	);
} else {
	compile(args(options));
}

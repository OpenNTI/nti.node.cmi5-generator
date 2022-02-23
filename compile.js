#!/usr/bin/env node
"use strict";
const {
	writeFileSync,
	mkdirSync,
	readdirSync,
	rmSync,
	promises: { readFile },
} = require("fs");
const { execSync } = require("child_process");
const path = require("path");

const args = require("command-line-args");
const Mustache = require("mustache");
const { parseFile } = require("@fast-csv/parse");
const { config } = require("process");

const safeFileName = (f) => f.toLowerCase().replaceAll(" ", "-");

async function compile(config) {
	const template = await readFile(config.template, "utf-8");
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
			});
	});

	const packages = readdirSync(config.output);

	for (let packageName of packages) {
		console.log("ZIPPING: ", packageName);
		execSync(`zip -r ${packageName}.zip ${packageName}`, {
			cwd: config.output,
		});
		rmSync(path.join(config.output, packageName), { recursive: true });
	}
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
		require("command-line-usage")([
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
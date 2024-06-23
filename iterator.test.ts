import { http, HttpResponse } from "msw";
import * as assert from "node:assert";
import { afterAll, beforeAll, test } from "bun:test";
import { setupServer } from "msw/node";
import { toIterable } from "./iterator.ts";

const address = new URL("http://localhost:3000")

function getQueryParams(url: string) {
	const queryString = url.split("?")[1];
	return new URLSearchParams(queryString);
}

const handlers = [
	http.get(new URL("/items", address).toString(), ({request}) => {
		const params = getQueryParams(request.url);
		const totalParam = params.get("total");
		const pageParam = params.get("page");
		const perPageParam = params.get("per_page");

		assert.ok(totalParam != null);
		assert.ok(pageParam != null);
		assert.ok(perPageParam != null);

		const total = Number(totalParam);
		const page = Number(pageParam);
		const perPage = Number(perPageParam);

		assert.ok(page > 0)

		const items = Array.from<number>({length: perPage});
		const start = perPage * (page - 1);

		for (let i = 0; i < perPage ; i += 1) {
			// classic off-by one
			items[i] = start + i + 1;
		}

		return HttpResponse.json({
			items,
			count: total,
		});
	})
];

const server = setupServer(...handlers);

beforeAll(() => {
	server.listen();
});

afterAll(() => {
	server.close();
});

type ListItemsMessage = {
	total: number;
	page: number;
	perPage: number;
}

async function listItems(msg: ListItemsMessage): Promise<{ items: number[], count: number }> {
	const params = new URLSearchParams();
	params.set("total", msg.total.toString());
	params.set("page", msg.page.toString());
	params.set("per_page", msg.perPage.toString());

	const response = await fetch(new URL(`/items?${params}`, address));

	// Best-in class error handling
	if (!response.ok) {
		const msg = await response.text();
		throw new Error(`Failed with msg: ${msg}`);
	}

	const data = await response.json();
	return data;
}

test("iterable", async () => {
	const total = 20;
	const perPage = 5;

	const iterable = toIterable(({page}) => listItems({total, perPage, page}), {
		initialPage: 1,
		getNextPage: (lastResponse, page) => {
			const nextPage = page + 1;
			if (nextPage * perPage <= lastResponse.count) {
				return nextPage;
			} else {
				return null;
			}
		}
	});

	const allItems: number[] = [];

	for await (const chunk of iterable) {
		allItems.push(...chunk.items);
	}

	assert.strictEqual(allItems.length, total);
	assert.strictEqual(allItems[0], 1);
	assert.strictEqual(allItems.at(-1), total)
});



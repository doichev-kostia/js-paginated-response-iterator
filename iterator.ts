export type GetNextPage<Res, Page> = (lastResponse: Res, lastPage: Page) => Page | null | undefined;

export type IterableOptions<Page, Res> = {
	initialPage: Page;
	getNextPage: GetNextPage<Res, Page>
}

export type PaginationOptions<Page> = {
	page: Page;
}
export type IterableFunction<Page> = (pagination: PaginationOptions<Page>) => Promise<any>

export async function* toIterable<Page, Func extends IterableFunction<Page>, Res = Awaited<ReturnType<Func>>>(func: Func, options: IterableOptions<Page, Res>): AsyncGenerator<Res> {
	let page = options.initialPage;
	while (true) {
		const response = await func({page});
		const nextPage = options.getNextPage(response, page);

		yield response;

		if (nextPage == null) {
			break;
		} else {
			page = nextPage;
		}
	}
}

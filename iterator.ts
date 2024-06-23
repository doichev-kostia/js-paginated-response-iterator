export type GetNextPage<Res, Page> = (lastResponse: Res, lastPage: Page) => Page | null | undefined;

export type IterableOptions<Page, Res> = {
	initialPage: Page;
	getNextPage: GetNextPage<Res, Page>
}

export type PaginationOptions<Page> = {
	page: Page;
}
export type IterableFunction<Page> = (pagination: PaginationOptions<Page>) => Promise<any>

export function toIterable<Page, Func extends IterableFunction<Page>, Res = Awaited<ReturnType<Func>>>(func: Func, options: IterableOptions<Page, Res>): AsyncIterable<Res> {
	return {
		[Symbol.asyncIterator]() {
			let page = options.initialPage;
			// when done: true, the value is not used
			let leapReturn = false;

			return {
				async next(): Promise<IteratorResult<Res>> {
					if (leapReturn) {
						return {done: true, value: undefined};
					}

					const response: Res = await func({page});
					const nextPage = options.getNextPage(response, page);
					if (nextPage == null) {
						leapReturn = true;
					} else {
						page = nextPage;
					}
					return {done: false, value: response};
				},
			};
		}

	};
}

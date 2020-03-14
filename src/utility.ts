export function flatPromise() {

    let resolve!: () => void;
    let reject!: () => void;

    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}

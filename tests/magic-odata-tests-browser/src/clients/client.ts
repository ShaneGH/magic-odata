import { User } from './generatedCode-angular'
import { uniqueNumber, uniqueString } from './utils'

export function postUser(val: User) {
    return post("Users", val);
}

export async function addUser(user?: Partial<User>) {

    const blogUser = {
        Name: uniqueString("User Name "),
        UserType: "User" as any,
        UserProfileType: "Standard",
        ...user || {}
    };

    return await postUser(blogUser as User);
}

function post<T>(entityName: string, value: T) {
    const uri = `http://localhost:5432/odata/test-entities/${entityName}`;
    const method = "POST"
    return fetch(uri, {
        method,
        body: JSON.stringify(value),
        headers: {
            "Content-Type": "application/json"
        }
    })
        .then(x => x.status < 200 || x.status >= 300
            ? x.text().then(err => handleError(uri, method, entityName, err, x, value)) as Promise<T>
            : x.json() as Promise<T>);
}

function handleError<T>(uri: string, method: string, entityName: string, error: any, resp: Response, reqPayload: any): T {
    throw new Error(JSON.stringify({ uri, method, entityName, error, status: resp.status, headers: resp.headers, reqPayload }, null, 2));
}
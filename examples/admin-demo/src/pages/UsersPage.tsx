import { CrudPage, RestAdapter, defineResource, textField } from '@nubitio/react-admin';

/**
 * CRUD page against the public JSONPlaceholder API.
 * Reads work for real; create/update/delete are accepted by the fake API
 * but not persisted — enough to exercise the full form/grid flow.
 */
const users = defineResource('https://jsonplaceholder.typicode.com/users', {
  title: 'Users',
  adapter: RestAdapter,
  mercure: false,
  fields: [
    textField().name('name').label('Name').build(),
    textField().name('username').label('Username').build(),
    textField().name('email').label('Email').build(),
    textField().name('phone').label('Phone').build(),
    textField().name('website').label('Website').build(),
  ],
});

export function UsersPage() {
  return <CrudPage resource={users} />;
}

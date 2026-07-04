import { DevExtremeCrudProvider } from '@nubitio/devextreme';
import { CrudPage, RestAdapter, defineResource, textField } from '@nubitio/react-admin';

/**
 * Same JSONPlaceholder users resource as UsersPage, but with DevExtreme grid/form.
 * Expand a row to load that user's posts in the master-detail panel.
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
  gridDetail: {
    url: 'https://jsonplaceholder.typicode.com/users/{id}/posts',
    fields: [
      textField().name('title').label('Title').build(),
      textField().name('body').label('Body').build(),
    ],
  },
});

export function UsersDevExtremePage() {
  return (
    <DevExtremeCrudProvider>
      <CrudPage resource={users} />
    </DevExtremeCrudProvider>
  );
}
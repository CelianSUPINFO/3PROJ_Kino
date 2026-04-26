export type RootStackParamList = {

  Home: undefined;

  Tonight: undefined;

  Login: undefined;

  Register: undefined;

  Search: undefined;

  Title: { type: "movie" | "tv"; id: number; title: string };

  Feed: undefined;

  Library: undefined;

  LibraryStatus: { status: string; title: string };

  Messages: undefined;

  Notifications: undefined;

  Settings: undefined;

  Profile: { userId: string };

  ListDetail: { listId: string; listName: string };

  Admin: undefined;

  Browse: { type: "movie" | "tv"; genreId?: string };

  Menu: undefined;

};


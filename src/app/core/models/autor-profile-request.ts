export interface AuthorProfileRequest {

  avatar:
    String | null;

  socialLinks:
    string[];

  bio:
    string;

  penName:
    string;

  bookGenres:
    string[];

  writingStyle:
    string[];

  authorReferences:
    string[];

  audience:
    string;

  language:
    string;
}
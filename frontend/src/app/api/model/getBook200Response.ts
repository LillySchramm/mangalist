/**
 * backend
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { GetBook200ResponseAllOfPublisher } from './getBook200ResponseAllOfPublisher';
import { Book } from './book';
import { Author } from './author';
import { OwnershipStatus } from './ownershipStatus';
import { GetBook200ResponseAllOf } from './getBook200ResponseAllOf';


export interface GetBook200Response { 
    publisherId: string | null;
    updatedAt: string;
    createdAt: string;
    language: string | null;
    printedPageCount: number | null;
    pageCount: number | null;
    description: string | null;
    publishedDate: string | null;
    subtitle: string | null;
    title: string | null;
    isbn: string;
    ownershipStatus: Array<OwnershipStatus>;
    publisher: GetBook200ResponseAllOfPublisher | null;
    authors: Array<Author>;
}


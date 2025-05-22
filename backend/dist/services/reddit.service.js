"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedditAPI = void 0;
const axios_1 = __importDefault(require("axios"));
class RedditAPI {
    constructor() {
        this.baseUrl = 'https://www.reddit.com/r';
        this.headers = {
            'User-Agent': 'ChapterOne/1.0.0'
        };
    }
    async getTopPosts(subreddit, limit = 100) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/${subreddit}/top.json`, {
                params: {
                    limit,
                    t: 'month' // Get top posts from the last month
                },
                headers: this.headers
            });
            return response.data.data.children.map((post) => ({
                id: post.data.id,
                title: post.data.title,
                selftext: post.data.selftext,
                author: post.data.author,
                ups: post.data.ups,
                num_comments: post.data.num_comments,
                created_utc: post.data.created_utc,
                url: post.data.url
            }));
        }
        catch (error) {
            console.error(`Error fetching posts from r/${subreddit}:`, error);
            throw error;
        }
    }
    async getComments(subreddit, postId) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/${subreddit}/comments/${postId}.json`, {
                headers: this.headers
            });
            return response.data[1].data.children.map((comment) => ({
                id: comment.data.id,
                author: comment.data.author,
                body: comment.data.body,
                ups: comment.data.ups,
                created_utc: comment.data.created_utc
            }));
        }
        catch (error) {
            console.error(`Error fetching comments for post ${postId}:`, error);
            throw error;
        }
    }
}
exports.RedditAPI = RedditAPI;

import axios from 'axios';

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    author: string;
    ups: number;
    num_comments: number;
    created_utc: number;
    url: string;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

interface RedditComment {
  data: {
    id: string;
    author: string;
    body: string;
    ups: number;
    created_utc: number;
  };
}

interface RedditCommentResponse {
  data: {
    children: RedditComment[];
  };
}

export class RedditAPI {
  private readonly baseUrl = 'https://www.reddit.com/r';
  private readonly headers = {
    'User-Agent': 'ChapterOne/1.0.0'
  };

  async getTopPosts(subreddit: string, limit: number = 100): Promise<any[]> {
    try {
      const response = await axios.get<RedditResponse>(
        `${this.baseUrl}/${subreddit}/top.json`,
        {
          params: {
            limit,
            t: 'month' // Get top posts from the last month
          },
          headers: this.headers
        }
      );

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
    } catch (error) {
      console.error(`Error fetching posts from r/${subreddit}:`, error);
      throw error;
    }
  }

  async getComments(subreddit: string, postId: string): Promise<any[]> {
    try {
      const response = await axios.get<[any, RedditCommentResponse]>(
        `${this.baseUrl}/${subreddit}/comments/${postId}.json`,
        {
          headers: this.headers
        }
      );

      return response.data[1].data.children.map((comment) => ({
        id: comment.data.id,
        author: comment.data.author,
        body: comment.data.body,
        ups: comment.data.ups,
        created_utc: comment.data.created_utc
      }));
    } catch (error) {
      console.error(`Error fetching comments for post ${postId}:`, error);
      throw error;
    }
  }
} 
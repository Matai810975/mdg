import { PropertyDeclaration } from "ts-morph";

/**
 * Extract comment from property declaration (JSDoc comments)
 */
export function getPropertyJSDocComment(property: PropertyDeclaration): string | null {
    // Get leading comment ranges
    const commentRanges = property.getLeadingCommentRanges();
  
    if (commentRanges.length > 0) {
      // Get the last comment range (closest to the property)
      const lastComment = commentRanges[commentRanges.length - 1];
      const commentText = lastComment.getText();
  
      // Handle JSDoc comments
      if (commentText.startsWith('/**') && commentText.endsWith('*/')) {
        // Extract the content between /** and */
        const content = commentText.substring(3, commentText.length - 2);
        // Remove leading * and trim whitespace
        return content.split('\n')
          .map(line => line.replace(/^\s*\*\s?/, '').trim())
          .filter(line => line.length > 0)
          .join(' ');
      }
  
      // Handle single line comments
      if (commentText.startsWith('//')) {
        return commentText.substring(2).trim();
      }
  
      // Handle block comments
      if (commentText.startsWith('/*') && commentText.endsWith('*/')) {
        return commentText.substring(2, commentText.length - 2).trim();
      }
    }
  
    return null;
  }
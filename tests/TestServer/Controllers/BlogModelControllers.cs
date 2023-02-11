using System.Linq.Expressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Formatter;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Query.Expressions;
using Microsoft.AspNetCore.OData.Results;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.OData.UriParser;
using TestServer.Model;

namespace TestServer.Controllers;

[Route(Program.OdataRoot)]
public class AppDetailsController : ODataController
{
    private readonly EntityDbContext _inMemoryDb;

    public AppDetailsController(EntityDbContext inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    [HttpGet("AppDetails")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<AppDetails> Get([FromODataUri] UserType key)
    {
        return _inMemoryDb.AppDetails
            .AsQueryable()
            .AsSingleResult();
    }

    [HttpGet("AppDetails/AppName")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<string> GetAppName()
    {
        return _inMemoryDb.AppDetails
            .AsQueryable()
            .Select(x => x.AppName)
            .AsSingleResult();
    }

    [HttpGet("AppDetails/AppNameWords")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<string> GetAppNameWords()
    {
        return _inMemoryDb.AppDetails
            .AsQueryable()
            .ToList()
            .SelectMany(x => x.AppNameWords)
            .AsQueryable();
    }

    [HttpGet("AppDetails/UserProfileTypes")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<UserProfileType> GetUserProfileTypes()
    {
        return _inMemoryDb.AppDetails
            .AsQueryable()
            .ToList()
            .SelectMany(x => x.UserProfileTypes)
            .AsQueryable();
    }

    [HttpGet("AppDetails/UserProfileTypes")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<UserType> GetUserTypes()
    {
        return _inMemoryDb.AppDetails
            .AsQueryable()
            .ToList()
            .SelectMany(x => x.UserTypes)
            .AsQueryable();
    }

    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<UserRole> Get()
    {
        var es = _inMemoryDb.UserRoles.AsQueryable();
        if (Request.Headers.ContainsKey("ToList"))
        {
            es = es.ToList().AsQueryable();
        }

        return es;
    }
}

[Route(Program.OdataRoot)]
public class AppDetailsBaseController : ODataController
{
    private readonly EntityDbContext _inMemoryDb;

    public AppDetailsBaseController(EntityDbContext inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    [HttpGet("AppDetailsBase")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<AppDetailsBase> Get([FromODataUri] UserType key)
    {
        return _inMemoryDb.AppDetails
            .ToList()
            .Cast<AppDetailsBase>()
            .AsQueryable()
            .AsSingleResult();
    }

    [HttpGet("AppDetailsBase/My.Odata.Entities.AppDetails")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<AppDetails> GetAppDetails()
    {
        return _inMemoryDb.AppDetails
            .AsQueryable()
            .AsSingleResult();
    }

    [HttpGet("AppDetailsBase/My.Odata.Entities.AppDetails/AppName")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<string> GetAppName()
    {
        return _inMemoryDb.AppDetails
            .AsQueryable()
            .Select(x => x.AppName)
            .AsSingleResult();
    }

    [HttpGet("AppDetailsBase/My.Odata.Entities.AppDetails/AppNameWords")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<string> GetAppNameWords()
    {
        return _inMemoryDb.AppDetails
            .AsQueryable()
            .ToList()
            .SelectMany(x => x.AppNameWords)
            .AsQueryable();
    }

    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<UserRole> Get()
    {
        var es = _inMemoryDb.UserRoles.AsQueryable();
        if (Request.Headers.ContainsKey("ToList"))
        {
            es = es.ToList().AsQueryable();
        }

        return es;
    }
}

[Route(Program.OdataRoot)]
public class UserRolesController : ODataController
{
    private readonly EntityDbContext _inMemoryDb;

    public UserRolesController(EntityDbContext inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    [HttpGet("UserRoles({key})")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<UserRole> Get([FromODataUri] UserType key)
    {
        return _inMemoryDb.UserRoles
            .AsQueryable()
            .Where(x => x.Key == key)
            .AsSingleResult();
    }

    [HttpGet("UserRoles({key})/Description")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<string> GetDescription([FromODataUri] UserType key)
    {
        return _inMemoryDb.UserRoles
            .AsQueryable()
            .Where(x => x.Key == key)
            .Select(x => x.Description)
            .AsSingleResult();
    }

    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<UserRole> Get()
    {
        var es = _inMemoryDb.UserRoles.AsQueryable();
        if (Request.Headers.ContainsKey("ToList"))
        {
            es = es.ToList().AsQueryable();
        }

        return es;
    }
}

[Route(Program.OdataRoot)]
public class UserProfilesController : ODataController
{
    private readonly EntityDbContext _inMemoryDb;

    public UserProfilesController(EntityDbContext inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    [HttpGet("UserProfiles({key})")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<UserProfile> Get([FromODataUri] UserProfileType key)
    {
        return _inMemoryDb.UserProfiles
            .AsQueryable()
            .Where(x => x.Key == key)
            .AsSingleResult();
    }

    [HttpGet("UserProfiles({key})/Description")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<string> GetDescription([FromODataUri] UserProfileType key)
    {
        return _inMemoryDb.UserProfiles
            .AsQueryable()
            .Where(x => x.Key == key)
            .Select(x => x.Description)
            .AsSingleResult();
    }

    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<UserProfile> Get()
    {
        var es = _inMemoryDb.UserProfiles.AsQueryable();
        if (Request.Headers.ContainsKey("ToList"))
        {
            es = es.ToList().AsQueryable();
        }

        return es;
    }
}

[Route(Program.OdataRoot)]
public abstract class ODataControllerBase<T> : ODataController
    where T : IHasMutableId
{
    private readonly EntityDbContext _inMemoryDb;

    public ODataControllerBase(EntityDbContext inMemoryDb)
    {
        _inMemoryDb = inMemoryDb;
    }

    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<T> Get()
    {
        var es = AllEntities(_inMemoryDb);
        if (Request.Headers.ContainsKey("ToList"))
        {
            es = es.ToList().AsQueryable();
        }

        return es;
    }

    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<T> Get([FromODataUri] string key)
    {
        return SingleResult.Create(Get().Where(p => p.Id == key));
    }

    protected abstract IQueryable<T> AllEntities(EntityDbContext db);

    protected abstract void AddEntity(EntityDbContext db, T entity);

    public ActionResult Post([FromBody] T item)
    {
        if (item == null)
            return BadRequest("null");

        item.Id = Guid.NewGuid().ToString();
        AddEntity(_inMemoryDb, item);
        _inMemoryDb.SaveChanges();
        return Created(item);
    }
}

public class HasIdsController : ODataControllerBase<HasId>
{
    private readonly EntityDbContext _inMemoryDb;

    public HasIdsController(EntityDbContext inMemoryDb)
        : base(inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    [HttpGet("HasIds({key})/My.Odata.Entities.User")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<User> GetUsersFromHasIds([FromRoute] string key)
    {
        return SingleResult.Create(_inMemoryDb.Users.Where(x => x.Id == key));
    }

    [HttpGet("HasIds/My.Odata.Entities.User")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<User> GetUsersFromHasIds()
    {
        return _inMemoryDb.Users;
    }

    [HttpGet("HasIds({key})/My.Odata.Entities.User/BlogPostComments")]
    [HttpGet("HasIds({key})/My.Odata.Entities.User/BlogPostComments/My.Odata.Entities.Comment")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<Comment> GetUsersCommentsFromHasIds([FromRoute] string key)
    {
        return _inMemoryDb.Users
            .Where(x => x.Id == key)
            .SelectMany(x => x.BlogPostComments);
    }

    [HttpGet("HasIds({key})/My.Odata.Entities.Blog/User")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<User> GetBlogsUserFromHasIds([FromRoute] string key)
    {
        return _inMemoryDb.Blogs
            .Where(x => x.Id == key)
            .Select(x => x.User)
            .AsSingleResult();
    }

    [HttpGet("HasIds({key})/My.Odata.Entities.Blog")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<Blog> GetBlogsFromHasIds([FromRoute] string key)
    {
        return SingleResult.Create(_inMemoryDb.Blogs.Where(x => x.Id == key));
    }

    [HttpGet("HasIds/My.Odata.Entities.Blog")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<Blog> GetBlogsFromHasIds()
    {
        return _inMemoryDb.Blogs;
    }

    protected override void AddEntity(EntityDbContext db, HasId entity) => throw new InvalidOperationException();

    protected override IQueryable<HasId> AllEntities(EntityDbContext db) => db.Users
        .Cast<HasId>()
        .Concat(db.Blogs)
        .Concat(db.BlogPosts)
        .Concat(db.Comments);
}

public class UsersController : ODataControllerBase<User>
{
    private readonly EntityDbContext _inMemoryDb;

    public UsersController(EntityDbContext inMemoryDb)
        : base(inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    [HttpGet("Users({key})/Name")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<string> GetBlogUser([FromRoute] string key)
    {
        return _inMemoryDb.Users
            .Where(x => x.Id == key)
            .Select(u => u.Name)
            .AsSingleResult();
    }

    [HttpGet("Users({key})/UserType")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<UserType> GetUserType([FromRoute] string key)
    {
        return _inMemoryDb.Users
            .Where(x => x.Id == key)
            .Select(u => u.UserType)
            .AsSingleResult();
    }

    [HttpGet("Users({key})/UserProfileType")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<UserProfileType> GetUserProfileType([FromRoute] string key)
    {
        return _inMemoryDb.Users
            .Where(x => x.Id == key)
            .Select(u => u.UserProfileType)
            .AsSingleResult();
    }

    protected override void AddEntity(EntityDbContext db, User entity) => db.Users.Add(entity);

    protected override IQueryable<User> AllEntities(EntityDbContext db) => db.Users;
}

public class BlogsController : ODataControllerBase<Blog>
{
    private readonly EntityDbContext _inMemoryDb;

    public BlogsController(EntityDbContext inMemoryDb)
        : base(inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    [HttpGet("Blogs({key})/User")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<User> GetBlogUser([FromRoute] string key)
    {
        return SingleResult.Create(_inMemoryDb.Blogs.Where(x => x.Id == key).Select(x => x.User));
    }

    [HttpGet("Blogs({key})/User/BlogPostComments")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<Comment> GetBlogUsersComments([FromRoute] string key)
    {
        return _inMemoryDb.Blogs
            .Where(x => x.Id == key)
            .SelectMany(x => x.User.BlogPostComments);
    }

    protected override void AddEntity(EntityDbContext db, Blog entity) => db.Blogs.Add(entity);

    protected override IQueryable<Blog> AllEntities(EntityDbContext db) => db.Blogs;
}

public class BlogSearchBinder : ISearchBinder
{
    public static readonly Dictionary<Type, Func<ParameterExpression, string, Expression>> _searchFunctions = new[]
    {
        Build<Blog>((b, t) => b.Name.Contains(t)),
        Build<BlogPost>((b, t) => b.Name.Contains(t) || b.Content.Contains(t)),
        Build<Comment>((b, t) => b.Title.Contains(t) || b.Text.Contains(t))
    }.ToDictionary(x => x.Key, x => x.Value);

    private static KeyValuePair<Type, Func<ParameterExpression, string, Expression>> Build<T>(Expression<Func<T, string, bool>> expr)
    {
        Func<ParameterExpression, string, Expression> cutExpr = (val, text) =>
        {
            return new SwapExpression(expr.Parameters[1], Expression.Constant(text))
                .Visit(new SwapTypedParam(val).Visit(expr.Body));
        };

        return KeyValuePair.Create(typeof(T), cutExpr);
    }

    public Expression BindSearch(SearchClause searchClause, QueryBinderContext context)
    {
        var input = Expression.Parameter(context.ElementClrType);
        var result = BindSearch(searchClause.Expression, input);
        var yy = Expression.Lambda(result, input);
        return yy;
    }

    private Expression BindSearch(SingleValueNode expr, ParameterExpression input)
    {
        if (expr is SearchTermNode stn)
        {
            if (!_searchFunctions.TryGetValue(input.Type, out var e))
                throw new NotSupportedException(input.Type.ToString());

            return e(input, stn.Text);
        }

        if (expr is UnaryOperatorNode uon)
        {
            var innerNode = BindSearch(uon.Operand, input);
            if (uon.OperatorKind == UnaryOperatorKind.Not)
                return Expression.Not(innerNode);

            throw new NotSupportedException(uon.OperatorKind.ToString());
        }

        if (expr is BinaryOperatorNode bon)
        {
            var lhs = BindSearch(bon.Left, input);
            var rhs = BindSearch(bon.Right, input);

            if (bon.OperatorKind == BinaryOperatorKind.And)
                return Expression.And(lhs, rhs);

            if (bon.OperatorKind == BinaryOperatorKind.Or)
                return Expression.Or(lhs, rhs);

            throw new NotSupportedException(bon.OperatorKind.ToString());
        }

        throw new NotSupportedException(expr.GetType().ToString());
    }

    private class SwapTypedParam : ExpressionVisitor
    {
        private readonly ParameterExpression _param;

        public SwapTypedParam(ParameterExpression param)
        {
            _param = param;
        }

        protected override Expression VisitParameter(ParameterExpression node)
        {
            return _param.Type == node.Type ? _param : node;
        }
    }

    private class SwapExpression : ExpressionVisitor
    {
        private readonly Expression from;
        private readonly Expression to;

        public SwapExpression(ParameterExpression from, Expression to)
        {
            this.from = from;
            this.to = to;
        }

        protected override Expression VisitParameter(ParameterExpression node)
        {
            return node == from ? to : node;
        }
    }
}

public class BlogPostsController : ODataControllerBase<BlogPost>
{
    private readonly EntityDbContext _inMemoryDb;

    public BlogPostsController(EntityDbContext inMemoryDb)
        : base(inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    [HttpGet("BlogPosts({key})/Blog")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<Blog> GetBlogPostBlog([FromRoute] string key)
    {
        return SingleResult.Create(
            _inMemoryDb.BlogPosts.Where(x => x.Id == key).Select(x => x.Blog));
    }

    [HttpGet("BlogPosts({key})/Words")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<string> GetBlogWords([FromRoute] string key)
    {
        return _inMemoryDb.BlogPosts
            .Where(x => x.Id == key)
            .ToList()
            .SelectMany(x => x.Words)
            .AsQueryable();
    }

    [HttpGet("BlogPosts({key})/Blog/User")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<User> GetBlogPostBlogUser([FromRoute] string key)
    {
        return SingleResult.Create(
            _inMemoryDb.BlogPosts.Where(x => x.Id == key).Select(x => x.Blog.User));
    }

    [HttpGet("BlogPosts({key})/Blog/User/BlogPostComments")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<Comment> GetBlogPostBlogUsersComments([FromRoute] string key)
    {
        return _inMemoryDb.BlogPosts
            .Where(x => x.Id == key)
            .SelectMany(x => x.Blog.User.BlogPostComments);
    }

    [HttpGet("BlogPosts/{key}")]
    [HttpGet("BlogPosts({key})/Comments")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<Comment> GetBlogPostComments([FromRoute] string key)
    {
        return _inMemoryDb.BlogPosts
            .Where(x => x.Id == key)
            .SelectMany(x => x.Comments);
    }

    [HttpGet("BlogPosts/{key}/Comments/{commentKey}")]
    [HttpGet("BlogPosts({key})/Comments({commentKey})")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<Comment> GetBlogPostComment([FromRoute] string key, [FromRoute] string commentKey)
    {
        return _inMemoryDb.BlogPosts
            .Where(x => x.Id == key)
            .SelectMany(x => x.Comments)
            .Where(c => c.Id == commentKey)
            .AsSingleResult();
    }

    [HttpGet("BlogPosts({key})/Comments({commentKey})/User")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<User> GetBlogPostCommentUser([FromRoute] string key, [FromRoute] string commentKey)
    {
        return _inMemoryDb.BlogPosts
            .Where(x => x.Id == key)
            .SelectMany(x => x.Comments)
            .Where(c => c.Id == commentKey)
            .Select(x => x.User)
            .AsSingleResult();
    }

    protected override void AddEntity(EntityDbContext db, BlogPost entity) => db.BlogPosts.Add(entity);

    protected override IQueryable<BlogPost> AllEntities(EntityDbContext db) => db.BlogPosts;
}

public class BlogPosts2Controller : ODataControllerBase<BlogPost>
{
    private readonly EntityDbContext _inMemoryDb;

    public BlogPosts2Controller(EntityDbContext inMemoryDb)
        : base(inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    [HttpGet("BlogPosts2({key})")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<BlogPost> GetBlogPostBlog([FromRoute] string key)
    {
        return SingleResult.Create(
            _inMemoryDb.BlogPosts.Where(x => x.Id == key));
    }

    protected override void AddEntity(EntityDbContext db, BlogPost entity) => db.BlogPosts.Add(entity);

    protected override IQueryable<BlogPost> AllEntities(EntityDbContext db) => db.BlogPosts;
}

public class CommentsController : ODataControllerBase<Comment>
{
    private readonly EntityDbContext _inMemoryDb;

    public CommentsController(EntityDbContext inMemoryDb)
        : base(inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    protected override void AddEntity(EntityDbContext db, Comment entity) => db.Comments.Add(entity);

    protected override IQueryable<Comment> AllEntities(EntityDbContext db) => db.Comments;

    [HttpGet("Comments({key})/Tags")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<CommentTag> GetCommentTags([FromRoute] string key)
    {
        return _inMemoryDb.Comments
            .Where(x => x.Id == key)
            .SelectMany(x => x.Tags);
    }

    [HttpGet("Comments({key})")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<Comment> GetComment([FromRoute] string key)
    {
        return _inMemoryDb.Comments
            .Where(x => x.Id == key)
            .AsSingleResult();
    }
}

public static class Utils
{
    public static SingleResult<T> AsSingleResult<T>(this IQueryable<T> items) => SingleResult.Create(items);
}
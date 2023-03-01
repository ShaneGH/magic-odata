using Microsoft.AspNetCore.OData;
using Microsoft.AspNetCore.OData.Query.Expressions;
using Microsoft.OData.Edm;
using Microsoft.OData.ModelBuilder;
using TestServer.Controllers;
using TestServer.Model;

public class Program
{
    public const string OdataRoot = "odata/test-entities";

    public static WebApplication App;

    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.

        builder.Services
            .AddCors()
            .AddControllers()
            .AddJsonOptions(o =>
            {
                o.JsonSerializerOptions.PropertyNamingPolicy = null;
                o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
            })
            .AddOData(opt => opt
                .EnableQueryFeatures()
                .AddRouteComponents(OdataRoot, GetEdmModel(), services => services.Add(
                    new ServiceDescriptor(typeof(ISearchBinder), _ => new TestServer.Controllers.BlogSearchBinder(), ServiceLifetime.Singleton))));

        // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
        // builder.Services.AddEndpointsApiExplorer(); // http://localhost:5432/swagger/index.html
        // builder.Services.AddSwaggerGen();

        builder.Services.AddScoped<EntityDbContext>();

        App = builder.Build();

        var i = 0;
        App.Use((ctxt, req) =>
        {
            if (ctxt.Request.Method == "GET")
                Console.WriteLine($"GET Req: {Interlocked.Increment(ref i)}");

            return req(ctxt);
        });

        App.UseODataRouteDebug();
        App.UseRouting();
        App.UseCors(builder => builder.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
        App.UseEndpoints(endpoints => endpoints.MapControllers());

        // App.UseSwagger();
        // App.UseSwaggerUI();
        Seed();

        App.Run();
    }

    static void Seed()
    {
        using var ctxt = App.Services.CreateScope();
        var dbContext = ctxt.ServiceProvider.GetRequiredService<EntityDbContext>();

        dbContext.AppDetails.AddRange(new[]
        {
            new AppDetails
            {
                AppName = "Blog app"
            }
        });

        dbContext.UserRoles.AddRange(new[]
        {
            new UserRole
            {
                Key = UserType.Admin,
                Description = "Admin"
            },
            new UserRole
            {
                Key = UserType.User,
                Description = "User"
            }
        });

        dbContext.UserProfiles.AddRange(new[]
        {
            new UserProfile
            {
                Key = UserProfileType.Advanced,
                Description = "Advanced"
            },
            new UserProfile
            {
                Key = UserProfileType.Standard,
                Description = "Standard"
            }
        });

        dbContext.OneOfEverythings.Add(new OneOfEverything
        {
            String = "Str",
            Guid = Guid.Parse("486fd5a2-4326-45c0-9a3f-ddc88dcb36d2"),
            Boolean = true,
            Date = new DateTime(1999, 2, 1),
            DateTimeOffset = new DateTimeOffset(
                new DateTime(1999, 1, 1, 11, 30, 30, 123),
                TimeSpan.FromMinutes(90)),
            TimeOfDay = new TimeOfDay(12, 1, 1, 1),
            Int16 = 1,
            Int32 = 2,
            Int64 = 3,
            Decimal = 3.3M,
            Double = 2.2,
            Single = 1.1F,
            Byte = 0x11,
            Binary = new byte[] { 0x12 },
            Duration = TimeSpan.FromDays(2)
                + TimeSpan.FromHours(3)
                + TimeSpan.FromMinutes(4)
                + TimeSpan.FromSeconds(5)
                + TimeSpan.FromMilliseconds(6),
            SByte = 0x10
        });

        dbContext.Users.Add(new User
        {
            Id = "Me",
            Name = "Me",
            UserType = UserType.Admin,
            Score = 0,
            UserProfileType = UserProfileType.Advanced,
            Blogs = new List<Blog>
            {
                new Blog
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Owners Blog"
                }
            }
        });

        dbContext.SaveChanges();
    }

    static IEdmModel GetEdmModel()
    {
        var builder = new ODataConventionModelBuilder();

        builder.Namespace = "My.Odata.Entities";
        builder.ContainerName = "My/Odata.Container";

        builder.Singleton<AppDetails>("AppDetails");
        builder.Singleton<AppDetailsBase>("AppDetailsBase");
        builder
            .EntityType<AppDetails>()
            .Function("CountUsers")
            .Returns<int>();

        builder.EntitySet<UserProfile>("UserProfiles");
        builder.EntitySet<UserRole>("UserRoles");
        builder.EntitySet<HasId>("HasIds");
        builder.EntitySet<User>("Users");
        builder.EntitySet<Blog>("Blogs");
        builder.EntitySet<BlogPost>("BlogPosts");
        builder.EntitySet<BlogPost>("BlogPosts2");
        builder.EntitySet<Comment>("Comments");
        builder.ComplexType<CommentTag>();
        builder.ComplexType<CommentMood>();

        builder.Function("MyBlogs").ReturnsCollection<Blog>();

        builder
            .EntityType<User>()
            .Function("FavouriteBlog")
            .Returns<Blog>();

        var wordCount1 = builder
            .EntityType<Blog>()
            .Function("WordCount");
        wordCount1.Parameter<bool>("filterCommentsOnly");
        wordCount1.Returns<int>();

        var wordCount2 = builder
            .EntityType<Blog>()
            .Function("WordCount");
        wordCount2.Returns<int>();

        builder
            .EntityType<Blog>()
            .Collection.Function("Top10BlogsByName")
            .ReturnsCollection<Blog>();

        builder.EntitySet<CompositeKeyItem>("CompositeKeyItems");
        builder.EntitySet<OneOfEverything>("OneOfEverythings");

        // builder.EntitySet<Shape>("Shapes");
        // builder.ComplexType<Square>().DerivesFrom<Shape>();
        // builder.ComplexType<Circle>().DerivesFrom<Shape>();

        return builder.GetEdmModel();
    }
}
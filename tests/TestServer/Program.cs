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
        App.Use(req => ctxt =>
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

        using (var ctxt = App.Services.CreateScope())
        {
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

            dbContext.SaveChanges();
        }

        App.Run();
    }

    static IEdmModel GetEdmModel()
    {
        var builder = new ODataConventionModelBuilder();

        // TODO: test special characters in namespace
        // asp net lets you add multiple modles by calling .AddOData(...) more than once
        builder.Namespace = "My.Odata.Entities";
        builder.ContainerName = "My/Odata.Container";

        builder.Singleton<AppDetails>("AppDetails");

        builder
            .Singleton<AppDetailsBase>("AppDetailsBase")
            .HasDescription()
            .HasDescription("The \"AppDetailsBase\"");

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

        builder.EntitySet<CompositeKeyItem>("CompositeKeyItems");

        // builder.EntitySet<Shape>("Shapes");
        // builder.ComplexType<Square>().DerivesFrom<Shape>();
        // builder.ComplexType<Circle>().DerivesFrom<Shape>();

        return builder.GetEdmModel();
    }
}
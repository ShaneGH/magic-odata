
using Microsoft.EntityFrameworkCore;

namespace TestServer.Model;

public class EntityDbContext : DbContext
{
    public DbSet<AppDetails> AppDetails => Set<AppDetails>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Blog> Blogs => Set<Blog>();
    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<CommentTag> Tags => Set<CommentTag>();
    public DbSet<CompositeKeyItem> CompositeKeyItems => Set<CompositeKeyItem>();
    public DbSet<OneOfEverything> OneOfEverythings => Set<OneOfEverything>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);
        optionsBuilder.UseInMemoryDatabase("Entities");
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        MapBlogModel(modelBuilder);
    }

    private void MapOneOffUseCaseModel(ModelBuilder modelBuilder)
    {
        modelBuilder
            .Entity<CompositeKeyItem>()
            .HasKey(u => new { u.Id1, u.Id2 });
    }

    private void MapBlogModel(ModelBuilder modelBuilder)
    {
        modelBuilder
            .Entity<AppDetails>()
            .HasKey(a => a.Id);

        modelBuilder
            .Entity<UserRole>()
            .HasKey(u => u.Key);

        modelBuilder
            .Entity<UserProfile>()
            .HasKey(u => u.Key);

        modelBuilder
            .Entity<User>()
            .HasKey(u => u.Id);

        modelBuilder
            .Entity<User>()
            .HasMany(u => u.Blogs)
            .WithOne(b => b.User);

        modelBuilder
            .Entity<Blog>()
            .HasKey(u => u.Id);

        modelBuilder
            .Entity<Blog>()
            .HasOne(b => b.User)
            .WithMany(u => u.Blogs)
            .HasForeignKey(b => b.UserId);

        modelBuilder
            .Entity<Blog>()
            .HasMany(b => b.Posts)
            .WithOne(u => u.Blog);

        modelBuilder
            .Entity<BlogPost>()
            .HasKey(u => u.Id);

        modelBuilder
            .Entity<BlogPost>()
            .HasOne(b => b.Blog)
            .WithMany(u => u.Posts)
            .HasForeignKey(b => b.BlogId);

        modelBuilder
            .Entity<BlogPost>()
            .HasMany(b => b.Comments)
            .WithOne(u => u.BlogPost);

        modelBuilder
            .Entity<Comment>()
            .HasKey(u => u.Id);

        modelBuilder
            .Entity<Comment>()
            .HasOne(b => b.BlogPost)
            .WithMany(u => u.Comments)
            .HasForeignKey(b => b.BlogPostId);

        modelBuilder
            .Entity<Comment>()
            .HasOne(b => b.User)
            .WithMany(u => u.BlogPostComments)
            .HasForeignKey(b => b.UserId);

        modelBuilder
            .Entity<Comment>()
            .HasMany(b => b.Tags)
            .WithMany(u => u.Comments);

        modelBuilder
            .Entity<CommentTag>()
            .HasKey(u => u.Tag);

        modelBuilder
            .Entity<CommentTag>()
            .HasMany(b => b.Comments)
            .WithMany(u => u.Tags);

        modelBuilder
            .Entity<CommentMood>()
            .HasKey(u => u.Key);

        modelBuilder
            .Entity<CommentMood>()
            .HasOne(b => b.Comment)
            .WithOne(u => u.Mood);
    }
}
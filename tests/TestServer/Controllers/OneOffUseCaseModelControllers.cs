using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Formatter;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Results;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.EntityFrameworkCore;
using TestServer.Model;

namespace TestServer.Controllers;

public class Value<T>
{
    public T Val { get; set; }
}

[Route(Program.OdataRoot)]
public class UnboundFunctionController : ODataController
{
    private readonly EntityDbContext _inMemoryDb;

    public UnboundFunctionController(EntityDbContext inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    [HttpGet("Calculator(lhs={lhs},rhs={rhs})")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<int> Calculator([FromODataUri] int lhs, [FromODataUri] int rhs)
    {
        return SingleResult.Create(new[] { lhs + rhs }.AsQueryable());
    }

    [HttpGet("Calculator2(vals={vals})")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<int> Calculator2([FromODataUri] IEnumerable<int> vals)
    {
        return SingleResult.Create(new[] { vals.Sum() }.AsQueryable());
    }

    [HttpGet("Calculator3(vals={vals})")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<int?> Calculator3([FromODataUri] IEnumerable<Value<int>> vals)
    {
        return SingleResult.Create(new[] { vals?.Select(x => x?.Val ?? 0).Sum() }.AsQueryable());
    }

    [HttpGet("Calculator4(lhs={lhs},rhs={rhs})")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<int> Calculator4([FromODataUri] Value<int> lhs, [FromODataUri] Value<int> rhs)
    {
        return SingleResult.Create(new[] { lhs?.Val ?? 0 + rhs?.Val ?? 0 }.AsQueryable());
    }
}

[Route(Program.OdataRoot)]
public class CompositeKeyItemsController : ODataController
{
    private readonly EntityDbContext _inMemoryDb;

    public CompositeKeyItemsController(EntityDbContext inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    [HttpGet("CompositeKeyItems(Id1={key1},Id2={key2})")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<CompositeKeyItem> GetUsersFromHasIds([FromRoute] string key1, Guid key2)
    {
        return SingleResult.Create(_inMemoryDb.CompositeKeyItems.Where(x => x.Id1 == key1 && x.Id2 == key2));
    }

    public ActionResult Post([FromBody] CompositeKeyItem item)
    {
        item.Id1 = Guid.NewGuid().ToString();
        item.Id2 = Guid.NewGuid();

        _inMemoryDb.CompositeKeyItems.Add(item);
        _inMemoryDb.SaveChanges();
        return Created(item);
    }
}

[Route(Program.OdataRoot)]
public class OneOfEverythingsController : ODataController
{
    private readonly EntityDbContext _inMemoryDb;

    public OneOfEverythingsController(EntityDbContext inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    [HttpGet("OneOfEverythings")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<OneOfEverything> Get()
    {
        var es = _inMemoryDb.OneOfEverythings.AsQueryable();
        if (Request.Headers.ContainsKey("ToList"))
        {
            es = es.ToList().AsQueryable();
        }

        return es;
    }

    public ActionResult Post([FromBody] CompositeKeyItem item)
    {
        item.Id1 = Guid.NewGuid().ToString();
        item.Id2 = Guid.NewGuid();

        _inMemoryDb.CompositeKeyItems.Add(item);
        _inMemoryDb.SaveChanges();
        return Created(item);
    }
}